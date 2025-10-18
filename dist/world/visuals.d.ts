/**
 * ROOM VISUAL DISPLAY SYSTEM
 *
 * Renders structure names and labels as visual markers on the map.
 * Persists display state for 3 ticks when activated.
 * Labels are stored in memory to survive ticks.
 */
/**
 * Display structure names as room visuals
 *
 * @param roomName - Name of room to display labels in
 * @param duration - How many ticks to display (default 3)
 */
export declare function showNames(roomName: string, duration?: number): void;
/**
 * Hide structure name displays
 *
 * @param roomName - Name of room to hide labels in
 */
export declare function hideNames(roomName: string): void;
/**
 * Check if names should be displayed in a room
 */
export declare function shouldShowNames(roomName: string): boolean;
/**
 * Render all visible structure names in a room as visual text
 * Call this each tick in your room orchestrator
 */
export declare function renderStructureNames(room: Room): void;
/**
 * Get visual display status for a room
 */
export declare function getVisualStatus(roomName: string): string;
/**
 * Get all rooms with active visuals
 */
export declare function getActiveVisualRooms(): string[];
//# sourceMappingURL=visuals.d.ts.map