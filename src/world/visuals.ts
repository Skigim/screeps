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
export function showNames(roomName: string, duration: number = 3): void {
  if (!Memory.empire) {
    Memory.empire = {};
  }
  if (!Memory.empire.visuals) {
    Memory.empire.visuals = {};
  }

  Memory.empire.visuals[roomName] = {
    expiresAt: Game.time + duration
  };

  console.log(`👁️  Displaying structure names in ${roomName} for ${duration} ticks`);
}

/**
 * Hide structure name displays
 * 
 * @param roomName - Name of room to hide labels in
 */
export function hideNames(roomName: string): void {
  if (Memory.empire?.visuals?.[roomName]) {
    delete Memory.empire.visuals[roomName];
  }
  console.log(`🚫 Hidden structure names in ${roomName}`);
}

/**
 * Check if names should be displayed in a room
 */
export function shouldShowNames(roomName: string): boolean {
  if (!Memory.empire?.visuals?.[roomName]) {
    return false;
  }

  const visual = Memory.empire.visuals[roomName];
  return Game.time <= visual.expiresAt;
}

/**
 * Render all visible structure names in a room as visual text
 * Call this each tick in your room orchestrator
 */
export function renderStructureNames(room: Room): void {
  if (!shouldShowNames(room.name)) {
    return;
  }

  const visual = new RoomVisual(room.name);
  
  // Get all structures from registry
  const registry = (Memory.structures as Record<string, any>) || {};
  
  for (const [id, info] of Object.entries(registry)) {
    if (info.roomName !== room.name) continue;

    // Get the actual object in the room
    const obj = Game.getObjectById(id as Id<AnyStructure>);
    if (!obj || !obj.pos) continue;

    // Draw the name at the structure's position
    let color = '#00FF00'; // Green by default

    // Color by type for better visibility
    if (info.type === 'source') {
      color = '#FFFF00'; // Yellow for sources
    } else if (info.type === 'controller') {
      color = '#0066FF'; // Blue for controller
    } else if (info.locked) {
      color = '#FF0000'; // Red if locked
    } else if (info.type === 'site') {
      color = '#FF9900'; // Orange for construction sites
    }

    // Draw text label above the structure
    visual.text(info.name, obj.pos.x, obj.pos.y - 0.5, {
      color,
      font: 0.6,
      align: 'center',
      backgroundColor: '#000000'
    });

    // Draw a small circle indicator
    visual.circle(obj.pos.x, obj.pos.y, {
      radius: 0.3,
      fill: 'transparent',
      stroke: color
    });
  }
}

/**
 * Get visual display status for a room
 */
export function getVisualStatus(roomName: string): string {
  if (!shouldShowNames(roomName)) {
    return `👁️  Labels: OFF`;
  }

  const expiresAt = Memory.empire?.visuals?.[roomName]?.expiresAt || 0;
  const ticksRemaining = expiresAt - Game.time;
  return `👁️  Labels: ON (${ticksRemaining} ticks remaining)`;
}

/**
 * Get all rooms with active visuals
 */
export function getActiveVisualRooms(): string[] {
  if (!Memory.empire?.visuals) {
    return [];
  }

  return Object.entries(Memory.empire.visuals)
    .filter(([_, visual]) => Game.time <= visual.expiresAt)
    .map(([roomName, _]) => roomName);
}
