"use client"

import { initializeApp, getApps } from "firebase/app"
import { getMessaging, getToken, isSupported, onMessage, type MessagePayload } from "firebase/messaging"

type ForegroundMessageHandler = (payload: MessagePayload) => void

function getFirebaseConfig() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  }

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
  const configured = Object.values(config).every(Boolean) && Boolean(vapidKey)

  return {
    config,
    vapidKey,
    configured,
  }
}

export function isFirebaseMessagingConfigured() {
  return getFirebaseConfig().configured
}

function buildServiceWorkerUrl() {
  const { config } = getFirebaseConfig()
  const params = new URLSearchParams()

  Object.entries(config).forEach(([key, value]) => {
    if (value) {
      params.set(key, value)
    }
  })

  return `/firebase-messaging-sw.js?${params.toString()}`
}

export async function requestFirebaseMessagingToken() {
  const { config, vapidKey, configured } = getFirebaseConfig()

  if (!configured || !vapidKey) {
    return null
  }

  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    return null
  }

  const supported = await isSupported()

  if (!supported) {
    return null
  }

  const permission = await Notification.requestPermission()

  if (permission !== "granted") {
    return null
  }

  const app = getApps().length ? getApps()[0]! : initializeApp(config)
  const messaging = getMessaging(app)
  const serviceWorkerRegistration = await navigator.serviceWorker.register(buildServiceWorkerUrl())

  return getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration,
  })
}

export async function listenForForegroundMessages(handler: ForegroundMessageHandler) {
  const { config, configured } = getFirebaseConfig()

  if (!configured) {
    return () => undefined
  }

  const supported = await isSupported()

  if (!supported) {
    return () => undefined
  }

  const app = getApps().length ? getApps()[0]! : initializeApp(config)
  const messaging = getMessaging(app)

  return onMessage(messaging, handler)
}
