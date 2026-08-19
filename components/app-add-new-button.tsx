import React, { ComponentProps } from 'react'
import { Button } from './ui/button'
import { Plus } from 'lucide-react'

type AppAddNewButtonProps = ComponentProps<typeof Button> & {
    title: string;
    openCreateDialog: () => void;
};

export default function AppAddNewButton({ title, openCreateDialog, className, ...props }: AppAddNewButtonProps) {
    return (
        <Button type="button" onClick={openCreateDialog} className={`rounded-xl ${className ?? ""}`} {...props}><Plus className="size-3.5" />{title}</Button>
    )
}
