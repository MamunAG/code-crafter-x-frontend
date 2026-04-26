/* global firebase */
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js")
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js")

const params = new URL(self.location.href).searchParams
const firebaseConfig = {
  apiKey: params.get("apiKey"),
  authDomain: params.get("authDomain"),
  projectId: params.get("projectId"),
  messagingSenderId: params.get("messagingSenderId"),
  appId: params.get("appId"),
}

if (Object.values(firebaseConfig).every(Boolean)) {
  firebase.initializeApp(firebaseConfig)
  const messaging = firebase.messaging()

  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || payload.data?.title || "New notification"
    const body = payload.notification?.body || payload.data?.body || ""
    const link = payload.fcmOptions?.link || payload.data?.link || "/"

    self.registration.showNotification(title, {
      body,
      data: {
        link,
      },
    })
  })
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const link = event.notification.data?.link || "/"

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(link)
          return client.focus()
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(link)
      }

      return undefined
    }),
  )
})
