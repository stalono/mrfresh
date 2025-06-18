export {};

declare global {
    interface Window {
        textareaRef: HTMLTextAreaElement | null;
        electronAPI: any
    }
}
