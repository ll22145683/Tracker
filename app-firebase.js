// Connects 追蹤本 to Firebase: Google sign-in plus a Firestore collection per user.
// The page script (index.html) only needs an object shaped like
//   db.collection('records').doc(id?) -> { id, set, update, delete }
//   db.collection('records').onSnapshot(next, error)
// so everything Firebase-specific lives in this file.
import { firebaseConfig } from './firebase-config.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
const loginEl = document.getElementById('login');
const loginBtn = document.getElementById('loginBtn');
const loginErr = document.getElementById('loginErr');

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

function showLogin(msg, canSignIn) {
  loginEl.hidden = false;
  loginErr.textContent = msg || '';
  loginBtn.disabled = !canSignIn;
}

function loginMessage(e) {
  const code = (e && e.code) || '';
  if (code === 'auth/unauthorized-domain') return '這個網址還沒加進 Firebase 的授權網域（Authentication → 設定 → 授權網域）。';
  if (code === 'auth/network-request-failed') return '沒有網路，連上網路後再登入一次。';
  if (code === 'auth/operation-not-allowed') return 'Firebase 還沒開啟 Google 登入（Authentication → 登入方式 → Google）。';
  return '登入沒有成功，請再試一次。';
}

function mapCode(code) {
  return ({
    'permission-denied': 'not_granted',
    'unauthenticated': 'not_granted',
    'unavailable': 'unavailable',
    'resource-exhausted': 'resource_exhausted',
    'invalid-argument': 'invalid_argument'
  })[code] || 'unknown';
}

function makeDb(fs, firestore, uid) {
  const col = fs.collection(firestore, 'users', uid, 'records');
  // Firestore keeps writes locally and resolves only after the server confirms.
  // Resolve after a short wait so the page stays responsive offline; a late failure still gets reported.
  const settle = (p) => {
    let late = false;
    const guarded = p.catch((e) => {
      const err = { code: mapCode(e && e.code), message: e && e.message };
      if (late && window.TrackerApp) window.TrackerApp.toast('有一筆變更沒有存到雲端，請檢查網路或重新登入。');
      throw err;
    });
    return Promise.race([guarded, new Promise((res) => setTimeout(() => { late = true; res(); }, 1500))]);
  };
  const docApi = (ref) => ({
    id: ref.id,
    set: (data) => settle(fs.setDoc(ref, data)),
    update: (data) => settle(fs.updateDoc(ref, data)),
    delete: () => settle(fs.deleteDoc(ref))
  });
  const colApi = {
    doc: (id) => docApi(id ? fs.doc(col, id) : fs.doc(col)),
    onSnapshot: (next, error) => fs.onSnapshot(col, { includeMetadataChanges: true },
      (snap) => next({
        docs: snap.docs.map((d) => ({ id: d.id, data: () => d.data() })),
        metadata: { fromCache: snap.metadata.fromCache, hasPendingWrites: snap.metadata.hasPendingWrites }
      }),
      (e) => { if (error) error({ code: mapCode(e && e.code), message: e && e.message }); })
  };
  return { collection: () => colApi };
}

async function start() {
  if (!firebaseConfig || !firebaseConfig.apiKey) {
    showLogin('還沒有設定 Firebase。請照 README 的步驟填好 firebase-config.js。', false);
    return;
  }
  let appMod, authMod, fs;
  try {
    [appMod, authMod, fs] = await Promise.all([
      import(SDK + 'firebase-app.js'),
      import(SDK + 'firebase-auth.js'),
      import(SDK + 'firebase-firestore.js')
    ]);
  } catch (e) {
    showLogin('載入失敗，請連上網路後重新開啟。', false);
    return;
  }
  const app = appMod.initializeApp(firebaseConfig);
  const auth = authMod.getAuth(app);
  let firestore;
  try {
    firestore = fs.initializeFirestore(app, {
      ignoreUndefinedProperties: true,
      localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() })
    });
  } catch (e) {
    firestore = fs.getFirestore(app);
  }
  const provider = new authMod.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  loginBtn.onclick = async () => {
    loginErr.textContent = '';
    loginBtn.disabled = true;
    try {
      await authMod.signInWithPopup(auth, provider);
    } catch (e) {
      if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') {
        await authMod.signInWithRedirect(auth, provider);
      } else if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
        loginErr.textContent = loginMessage(e);
      }
    } finally {
      loginBtn.disabled = false;
    }
  };
  authMod.getRedirectResult(auth).catch((e) => { loginErr.textContent = loginMessage(e); });

  window.TrackerAuth = {
    email: () => (auth.currentUser && auth.currentUser.email) || '',
    // Signing out also wipes the offline copy kept on this device, so the next person
    // to pick it up can't read the records from the browser's storage.
    signOut: async () => {
      try { await authMod.signOut(auth); } catch (e) {}
      try { await fs.terminate(firestore); await fs.clearIndexedDbPersistence(firestore); } catch (e) {}
      location.reload();
    }
  };

  authMod.onAuthStateChanged(auth, (user) => {
    if (user) {
      loginEl.hidden = true;
      window.TrackerApp.attach(makeDb(fs, firestore, user.uid));
    } else {
      window.TrackerApp.detach();
      showLogin('', true);
    }
  });
}

start();
