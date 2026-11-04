declare function tursoExecute(sql: string, args?: any[]): Promise<any>;
export declare function closeDatabase(): void;
export declare function initializeDatabase(): Promise<void>;
export declare function getDatabase(): {
    execute: typeof tursoExecute;
};
export {};
//# sourceMappingURL=init-db.d.ts.map