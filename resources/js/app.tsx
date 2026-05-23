import { createInertiaApp } from '@inertiajs/react';

const appName = import.meta.env.VITE_APP_NAME || 'Fufas Markets';

createInertiaApp({
    title: (title) => (title ? `${title} · ${appName}` : appName),
    progress: false, // replaced with custom FufasProgress bar
});
