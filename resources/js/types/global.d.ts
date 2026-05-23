import type { Auth } from '@/types/auth';

declare module '*.png' {
    const src: string;
    export default src;
}
declare module '*.jpg' {
    const src: string;
    export default src;
}
declare module '*.svg' {
    const src: string;
    export default src;
}

declare module 'react' {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            sidebarOpen: boolean;
            [key: string]: unknown;
        };
    }
}
