import React, { ReactNode } from 'react'

export default function AppContainer({ children, title }: { children?: ReactNode, title: string }) {
    return (
        <div className="flex flex-col">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl p-5">
                {title}
            </h1>
            {children}
        </div>
    )
}
