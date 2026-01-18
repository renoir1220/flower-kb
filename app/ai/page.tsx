import { Suspense } from 'react';
import { AIChat } from "@/components/ai-chat";

export default function AIPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
            <AIChat type="page" showBackLink />
        </Suspense>
    );
}
