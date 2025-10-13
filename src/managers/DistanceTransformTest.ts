/**
 * Distance Transform Test
 *
 * Tests the Distance Transform algorithm for optimal structure placement.
 * This uses a two-pass algorithm to calculate the distance of each tile from the nearest wall.
 * The result is used to find the best "anchor" position for compact base layouts.
 *
 * Usage: Run `testDistanceTransform('W1N1')` from the console
 */

export class DistanceTransformTest {
  /**
   * Run the Distance Transform test for a room
   * Visualizes the results in the game
   */
  public static run(roomName: string): void {
    console.log(`\n╔═══════════════════════════════════════════╗`);
    console.log(`║ Distance Transform Test                   ║`);
    console.log(`║ Room: ${roomName.padEnd(36)} ║`);
    console.log(`╚═══════════════════════════════════════════╝\n`);

    const room = Game.rooms[roomName];
    if (!room) {
      console.log(`❌ Room ${roomName} not visible. Cannot run test.`);
      return;
    }

    // Step 1: Calculate Distance Transform
    console.log(`⏳ Calculating Distance Transform...`);
    const distanceMatrix = this.calculateDistanceTransform(room);
    console.log(`✅ Distance Transform complete`);

    // Step 2: Find best anchor point
    console.log(`⏳ Finding optimal anchor position...`);
    const anchorPos = this.findBestAnchor(room, distanceMatrix);
    if (!anchorPos) {
      console.log(`❌ Could not find valid anchor position`);
      return;
    }
    console.log(`✅ Anchor found at (${anchorPos.x}, ${anchorPos.y}) with distance value ${distanceMatrix.get(anchorPos.x, anchorPos.y)}`);

    // Step 3: Generate spiral structure positions
    console.log(`⏳ Generating spiral structure positions...`);
    const structureCount = 11; // 5 extensions + 6 for testing
    const structurePositions = this.generateSpiralPositions(room, anchorPos, structureCount);
    console.log(`✅ Generated ${structurePositions.length} structure positions`);

    // Step 4: Visualize everything
    console.log(`⏳ Rendering visualization...`);
    this.visualize(room, distanceMatrix, anchorPos, structurePositions);
    console.log(`✅ Visualization complete`);

    console.log(`\n✅ Distance Transform test complete!`);
    console.log(`   Check room ${roomName} for visual results.`);
  }

  /**
   * Two-pass Distance Transform algorithm
   * Returns a CostMatrix where each tile's value is its distance from the nearest wall
   */
  private static calculateDistanceTransform(room: Room): CostMatrix {
    const terrain = room.getTerrain();
    const matrix = new PathFinder.CostMatrix();

    // Initialize: Walls = 0, All other tiles = 255 (max distance)
    for (let y = 0; y < 50; y++) {
      for (let x = 0; x < 50; x++) {
        if (terrain.get(x, y) === TERRAIN_MASK_WALL) {
          matrix.set(x, y, 0);
        } else {
          matrix.set(x, y, 255);
        }
      }
    }

    // First pass: Top-left to bottom-right
    for (let y = 0; y < 50; y++) {
      for (let x = 0; x < 50; x++) {
        if (matrix.get(x, y) === 0) continue; // Skip walls

        let minDist = matrix.get(x, y);

        // Check top neighbor
        if (y > 0) {
          minDist = Math.min(minDist, matrix.get(x, y - 1) + 1);
        }

        // Check left neighbor
        if (x > 0) {
          minDist = Math.min(minDist, matrix.get(x - 1, y) + 1);
        }

        // Check top-left diagonal
        if (x > 0 && y > 0) {
          minDist = Math.min(minDist, matrix.get(x - 1, y - 1) + 1);
        }

        // Check top-right diagonal
        if (x < 49 && y > 0) {
          minDist = Math.min(minDist, matrix.get(x + 1, y - 1) + 1);
        }

        matrix.set(x, y, minDist);
      }
    }

    // Second pass: Bottom-right to top-left
    for (let y = 49; y >= 0; y--) {
      for (let x = 49; x >= 0; x--) {
        if (matrix.get(x, y) === 0) continue; // Skip walls

        let minDist = matrix.get(x, y);

        // Check bottom neighbor
        if (y < 49) {
          minDist = Math.min(minDist, matrix.get(x, y + 1) + 1);
        }

        // Check right neighbor
        if (x < 49) {
          minDist = Math.min(minDist, matrix.get(x + 1, y) + 1);
        }

        // Check bottom-right diagonal
        if (x < 49 && y < 49) {
          minDist = Math.min(minDist, matrix.get(x + 1, y + 1) + 1);
        }

        // Check bottom-left diagonal
        if (x > 0 && y < 49) {
          minDist = Math.min(minDist, matrix.get(x - 1, y + 1) + 1);
        }

        matrix.set(x, y, minDist);
      }
    }

    return matrix;
  }

  /**
   * Find the best anchor point (tile with highest distance value)
   * This is the most "open" spot in the room
   */
  private static findBestAnchor(room: Room, distanceMatrix: CostMatrix): RoomPosition | null {
    let maxDistance = 0;
    let bestPos: { x: number; y: number } | null = null;

    // Avoid edges (3 tiles from border)
    for (let y = 3; y < 47; y++) {
      for (let x = 3; x < 47; x++) {
        const distance = distanceMatrix.get(x, y);
        if (distance > maxDistance) {
          maxDistance = distance;
          bestPos = { x, y };
        }
      }
    }

    if (!bestPos) return null;

    return new RoomPosition(bestPos.x, bestPos.y, room.name);
  }

  /**
   * Generate structure positions in a spiral pattern around the anchor
   * Uses checkerboard pattern to ensure spacing between structures
   */
  private static generateSpiralPositions(
    room: Room,
    anchor: RoomPosition,
    count: number
  ): RoomPosition[] {
    const positions: RoomPosition[] = [];
    const terrain = room.getTerrain();

    // Spiral outward from anchor
    let radius = 0;
    const maxRadius = 10; // Don't spiral too far

    while (positions.length < count && radius < maxRadius) {
      // Check all tiles in the current ring
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          // Skip tiles not on the edge of the current ring
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) {
            continue;
          }

          const x = anchor.x + dx;
          const y = anchor.y + dy;

          // Bounds check
          if (x < 1 || x > 48 || y < 1 || y > 48) continue;

          // Checkerboard pattern: Only place on tiles where (x + y) is even
          if ((x + y) % 2 !== 0) continue;

          // Skip walls
          if (terrain.get(x, y) === TERRAIN_MASK_WALL) continue;

          // Valid position!
          positions.push(new RoomPosition(x, y, room.name));

          if (positions.length >= count) break;
        }
        if (positions.length >= count) break;
      }

      radius++;
    }

    return positions;
  }

  /**
   * Visualize the Distance Transform results
   */
  private static visualize(
    room: Room,
    distanceMatrix: CostMatrix,
    anchor: RoomPosition,
    structurePositions: RoomPosition[]
  ): void {
    const visual = room.visual;

    // Clear previous visuals
    visual.clear();

    // Draw distance values (color-coded)
    for (let y = 0; y < 50; y++) {
      for (let x = 0; x < 50; x++) {
        const distance = distanceMatrix.get(x, y);

        // Skip walls (distance 0)
        if (distance === 0) continue;

        // Color gradient: Blue (low distance) to Red (high distance)
        const normalizedDist = Math.min(distance / 10, 1); // Cap at 10 for color
        const red = Math.floor(normalizedDist * 255);
        const blue = Math.floor((1 - normalizedDist) * 255);
        const color = `#${red.toString(16).padStart(2, '0')}00${blue.toString(16).padStart(2, '0')}`;

        // Draw text showing distance value
        visual.text(distance.toString(), x, y + 0.25, {
          color: color,
          font: 0.4,
          opacity: 0.6
        });

        // Draw background circle for better visibility
        visual.circle(x, y, {
          radius: 0.35,
          fill: color,
          opacity: 0.1
        });
      }
    }

    // Draw anchor point (large green circle)
    visual.circle(anchor.x, anchor.y, {
      radius: 0.8,
      fill: '#00ff00',
      opacity: 0.5,
      stroke: '#00ff00',
      strokeWidth: 0.2
    });
    visual.text('ANCHOR', anchor.x, anchor.y - 1, {
      color: '#00ff00',
      font: 0.6,
      align: 'center'
    });

    // Draw structure positions (yellow circles)
    for (const pos of structurePositions) {
      visual.circle(pos.x, pos.y, {
        radius: 0.5,
        fill: '#ffff00',
        opacity: 0.4,
        stroke: '#ffff00',
        strokeWidth: 0.15
      });
    }

    // Draw legend
    visual.text('Distance Transform Test', 1, 1, {
      color: '#ffffff',
      font: 0.8,
      align: 'left',
      backgroundColor: '#000000',
      backgroundPadding: 0.2
    });
    visual.text(`Anchor: (${anchor.x}, ${anchor.y})`, 1, 2.5, {
      color: '#00ff00',
      font: 0.6,
      align: 'left'
    });
    visual.text(`Structures: ${structurePositions.length} planned`, 1, 3.5, {
      color: '#ffff00',
      font: 0.6,
      align: 'left'
    });
    visual.text('Blue = Near walls, Red = Open space', 1, 4.5, {
      color: '#ffffff',
      font: 0.5,
      align: 'left'
    });
  }
}
