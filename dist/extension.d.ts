type ExtensionContext = {
    subscriptions: Array<{
        dispose(): void;
    }>;
    extensionPath: string;
    extensionId: string;
    globalState: {
        get<T>(key: string, defaultValue?: T): T | undefined;
        update(key: string, value: unknown): void;
        keys(): readonly string[];
    };
    storagePath: string;
};
export declare function activate(context: ExtensionContext): void;
export declare function deactivate(): void;
export {};
