importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyAvrcpiTb7RNsJButYHo1GNS3Nos-SGCbM",
  authDomain: "thearcschool-a374b.firebaseapp.com",
  projectId: "thearcschool-a374b",
  storageBucket: "thearcschool-a374b.firebasestorage.app",
  messagingSenderId: "349267453118",
  appId: "1:349267453118:web:dc886faafe5ffe381feaef",
  measurementId: "G-2JSWBHCH94"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/vite.svg',
    data: payload.data,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
