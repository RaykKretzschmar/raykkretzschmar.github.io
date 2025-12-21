// Constants
const G = 6.67430e-11;
const SCALE = 1e9; // 1e9 meters per pixel (approx)
const TIMESTEP = 86400; // 1 day in seconds
const MIN_RADIUS = 3;
const MIN_MASS = 1e20;
const MAX_BODIES = 100; // Limit to prevent performance issues
const MIN_FRAGMENT_MASS = 1e26; // Only bodies above this mass can produce fragments

class Body {
    constructor(x, y, vx, vy, mass, radius, color) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.mass = mass;
        this.radius = radius;
        this.color = color;
        this.dead = false;
        this.trail = [];
        this.maxTrailLength = 50;
    }

    draw(ctx, width, height, cameraX, cameraY) {
        const x = width / 2 + this.x / SCALE - cameraX;
        const y = height / 2 - this.y / SCALE - cameraY;

        // Draw Trail
        if (this.trail.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.5;
            for (let i = 0; i < this.trail.length - 1; i++) {
                const p1 = this.trail[i];
                const p2 = this.trail[i + 1];
                ctx.moveTo(width / 2 + p1.x / SCALE - cameraX, height / 2 - p1.y / SCALE - cameraY);
                ctx.lineTo(width / 2 + p2.x / SCALE - cameraX, height / 2 - p2.y / SCALE - cameraY);
            }
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }

        ctx.beginPath();
        ctx.arc(x, y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }

    updatePosition(dt) {
        // Position update is handled in the main loop with sub-stepping
        // We just update the trail here or after the sub-steps
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }
    }

    distanceTo(other) {
        const dx = other.x - this.x;
        const dy = other.y - this.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    collidesWith(other) {
        const distance = this.distanceTo(other);
        const scaledRadius1 = this.radius * SCALE;
        const scaledRadius2 = other.radius * SCALE;
        return distance <= scaledRadius1 + scaledRadius2;
    }
}

class GravitySimulation {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.bodies = [];
        this.isRunning = false;
        this.animationFrameId = null;

        // Interaction State
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.currentX = 0;
        this.currentY = 0;

        // Camera State
        this.cameraX = 0;
        this.cameraY = 0;
        this.keys = {
            ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
            w: false, a: false, s: false, d: false,
            W: false, A: false, S: false, D: false
        };

        this.resizeCanvas = this.resizeCanvas.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.loop = this.loop.bind(this);

        this.init();
    }

    init() {
        window.addEventListener('resize', this.resizeCanvas);
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
        this.resizeCanvas();

        this.canvas.addEventListener('mousedown', this.handleMouseDown);
        this.canvas.addEventListener('mousemove', this.handleMouseMove);
        this.canvas.addEventListener('mouseup', this.handleMouseUp);

        this.reset();
    }

    reset() {
        // Initial Bodies
        const sun = new Body(0, 0, 0, 0, 1.989e30, 30, 'rgb(255, 255, 0)');
        const earth = new Body(1.496e11, 0, 0, 29783, 5.972e24, 10, 'rgb(0, 0, 255)');
        this.bodies = [sun, earth];
    }

    resizeCanvas() {
        if (this.canvas) {
            this.canvas.width = this.canvas.parentElement.clientWidth;
            this.canvas.height = this.canvas.parentElement.clientHeight;
        }
    }

    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.resizeCanvas(); // Ensure correct size on start
            this.loop();
        }
    }

    stop() {
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
    }

    handleKeyDown(e) {
        if (this.keys.hasOwnProperty(e.key)) {
            this.keys[e.key] = true;
        }
    }

    handleKeyUp(e) {
        if (this.keys.hasOwnProperty(e.key)) {
            this.keys[e.key] = false;
        }
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.isDragging = true;
        this.startX = e.clientX - rect.left;
        this.startY = e.clientY - rect.top;
        this.currentX = this.startX;
        this.currentY = this.startY;
    }

    handleMouseMove(e) {
        if (this.isDragging) {
            const rect = this.canvas.getBoundingClientRect();
            this.currentX = e.clientX - rect.left;
            this.currentY = e.clientY - rect.top;
        }
    }

    handleMouseUp(e) {
        if (this.isDragging) {
            this.isDragging = false;
            const rect = this.canvas.getBoundingClientRect();
            const endX = e.clientX - rect.left;
            const endY = e.clientY - rect.top;

            const startXSim = (this.startX - this.canvas.width / 2 + this.cameraX) * SCALE;
            const startYSim = -(this.startY - this.canvas.height / 2 + this.cameraY) * SCALE;

            // Velocity scaling: 1 pixel drag = 1000 m/s
            const velX = -(endX - this.startX) * 1000;
            const velY = (endY - this.startY) * 1000;

            // Increase mass to be significant (1e28 to 1e30) so they attract each other
            const newMass = (Math.random() * (1e30 - 1e28)) + 1e28;
            const newRadius = Math.floor(Math.random() * 11) + 10; // 10 to 20
            const color = `rgb(${Math.floor(Math.random() * 156) + 100}, ${Math.floor(Math.random() * 156) + 100}, ${Math.floor(Math.random() * 156) + 100})`;

            this.bodies.push(new Body(startXSim, startYSim, velX, velY, newMass, newRadius, color));
        }
    }

    computeGravitationalForce(b1, b2) {
        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) return { fx: 0, fy: 0 };

        const force = (G * b1.mass * b2.mass) / (distance * distance);
        const fx = force * (dx / distance);
        const fy = force * (dy / distance);

        return { fx, fy };
    }

    handleCollisions(bodies) {
        const mergedBodies = new Set();
        const nextBodies = [];
        let fragmentsSpawned = 0;
        const maxNewFragments = Math.max(0, MAX_BODIES - bodies.length);

        for (let i = 0; i < bodies.length; i++) {
            if (mergedBodies.has(i)) continue;

            let b1 = bodies[i];

            for (let j = i + 1; j < bodies.length; j++) {
                if (mergedBodies.has(j)) continue;

                let b2 = bodies[j];

                if (b1.collidesWith(b2)) {
                    // Collision Physics
                    const totalMass = b1.mass + b2.mass;

                    // Debris Calculation
                    // Generate debris proportional to the smaller body
                    const smallerMass = Math.min(b1.mass, b2.mass);
                    const debrisMassTotal = smallerMass * 0.5; // 50% of smaller body becomes debris
                    const newMass = totalMass - debrisMassTotal;

                    // Center of Mass Velocity (Conservation of Momentum)
                    const newVx = (b1.mass * b1.vx + b2.mass * b2.vx) / totalMass;
                    const newVy = (b1.mass * b1.vy + b2.mass * b2.vy) / totalMass;

                    // Center of Mass Position
                    const newX = (b1.mass * b1.x + b2.mass * b2.x) / totalMass;
                    const newY = (b1.mass * b1.y + b2.mass * b2.y) / totalMass;

                    // New Radius (Area conservation approximation)
                    // Visual radius is in pixels. Physical radius = radius * SCALE
                    // Area ~ radius^2
                    const r1 = b1.radius;
                    const r2 = b2.radius;
                    // Area proportional to mass for visual consistency
                    const totalArea = Math.PI * (r1 * r1 + r2 * r2);
                    const newArea = totalArea * (newMass / totalMass);
                    const newRadius = Math.sqrt(newArea / Math.PI);

                    // Color: Inherit from largest
                    const color = b1.mass > b2.mass ? b1.color : b2.color;

                    // Create Merged Body
                    // We update b1 to be the new merged body so it can collide with others in this frame potentially
                    // (though physics-wise simpler to just let it be for this frame)
                    b1 = new Body(newX, newY, newVx, newVy, newMass, newRadius, color);

                    // Spawn Fragments (only if both bodies are massive enough and we have room)
                    const canFragment = smallerMass >= MIN_FRAGMENT_MASS && fragmentsSpawned < maxNewFragments;

                    if (canFragment) {
                        const fragmentCount = Math.min(
                            Math.floor(Math.random() * 3) + 2, // 2 to 4 fragments
                            maxNewFragments - fragmentsSpawned
                        );
                        const massPerFragment = debrisMassTotal / fragmentCount;
                        const areaPerFragment = (totalArea - newArea) / fragmentCount;
                        const fragmentRadius = Math.max(2, Math.sqrt(areaPerFragment / Math.PI));

                        for (let k = 0; k < fragmentCount; k++) {
                            const angle = Math.random() * Math.PI * 2;

                            // Ejection velocity: needs to be high enough to be visible and not immediately re-merge
                            const ejectionSpeed = (Math.random() * 2e5) + 1e5; // 100km/s - 300km/s

                            const fragVx = newVx + Math.cos(angle) * ejectionSpeed;
                            const fragVy = newVy + Math.sin(angle) * ejectionSpeed;

                            // Position: Spawn at the edge of the new body + fragment radius + buffer
                            const spawnDistance = (newRadius + fragmentRadius) * SCALE * 1.5;
                            const fragX = newX + Math.cos(angle) * spawnDistance;
                            const fragY = newY + Math.sin(angle) * spawnDistance;

                            // Fragments use the smaller body's color
                            const fragColor = b1.mass > b2.mass ? b2.color : b1.color;

                            nextBodies.push(new Body(fragX, fragY, fragVx, fragVy, massPerFragment, fragmentRadius, fragColor));
                            fragmentsSpawned++;
                        }
                    }

                    mergedBodies.add(j);
                }
            }
            nextBodies.push(b1);
        }

        return nextBodies;
    }

    loop() {
        if (!this.isRunning) return;

        // Clear
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Update Camera
        const speed = 10;
        if (this.keys.ArrowUp || this.keys.w || this.keys.W) this.cameraY -= speed;
        if (this.keys.ArrowDown || this.keys.s || this.keys.S) this.cameraY += speed;
        if (this.keys.ArrowLeft || this.keys.a || this.keys.A) this.cameraX -= speed;
        if (this.keys.ArrowRight || this.keys.d || this.keys.D) this.cameraX += speed;

        // Physics Sub-stepping
        const subSteps = 8; // More stable simulation
        const dt = TIMESTEP / subSteps;

        for (let step = 0; step < subSteps; step++) {
            // 1. Calculate all forces first
            const forces = new Array(this.bodies.length).fill(null).map(() => ({ fx: 0, fy: 0 }));

            for (let i = 0; i < this.bodies.length; i++) {
                for (let j = i + 1; j < this.bodies.length; j++) {
                    if (!this.bodies[i].dead && !this.bodies[j].dead) {
                        const { fx, fy } = this.computeGravitationalForce(this.bodies[i], this.bodies[j]);

                        forces[i].fx += fx;
                        forces[i].fy += fy;
                        forces[j].fx -= fx; // Newton's 3rd Law: Equal and opposite force
                        forces[j].fy -= fy;
                    }
                }
            }

            // 2. Update positions using calculated forces
            for (let i = 0; i < this.bodies.length; i++) {
                if (!this.bodies[i].dead) {
                    const body = this.bodies[i];
                    const fx = forces[i].fx;
                    const fy = forces[i].fy;

                    body.vx += (fx / body.mass) * dt;
                    body.vy += (fy / body.mass) * dt;
                    body.x += body.vx * dt;
                    body.y += body.vy * dt;
                }
            }

            // 3. Handle Collisions
            this.bodies = this.handleCollisions(this.bodies);
        }

        // Update trails
        for (const body of this.bodies) {
            body.updatePosition();
        }

        // Draw
        for (const body of this.bodies) {
            body.draw(this.ctx, this.canvas.width, this.canvas.height, this.cameraX, this.cameraY);
        }

        // Draw Drag Line
        if (this.isDragging) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.startX, this.startY);
            this.ctx.lineTo(this.currentX, this.currentY);
            this.ctx.strokeStyle = 'white';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }

        this.animationFrameId = requestAnimationFrame(this.loop);
    }
}

// Check if we are on the standalone page and start automatically
if (document.getElementById('simCanvas')) {
    const sim = new GravitySimulation('simCanvas');
    sim.start();
}
