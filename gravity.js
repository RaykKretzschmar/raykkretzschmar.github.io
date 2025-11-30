// Constants
const G = 6.67430e-11;
const SCALE = 1e9; // 1e9 meters per pixel (approx)
const TIMESTEP = 86400; // 1 day in seconds
const MIN_RADIUS = 3;
const MIN_MASS = 1e20;

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

    draw(ctx, width, height) {
        const x = width / 2 + this.x / SCALE;
        const y = height / 2 - this.y / SCALE;

        // Draw Trail
        if (this.trail.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.5;
            for (let i = 0; i < this.trail.length - 1; i++) {
                const p1 = this.trail[i];
                const p2 = this.trail[i + 1];
                ctx.moveTo(width / 2 + p1.x / SCALE, height / 2 - p1.y / SCALE);
                ctx.lineTo(width / 2 + p2.x / SCALE, height / 2 - p2.y / SCALE);
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

    bounceOff(other) {
        const dx = other.x - this.x;
        const dy = other.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) return;

        const nx = dx / distance;
        const ny = dy / distance;

        const dvx = other.vx - this.vx;
        const dvy = other.vy - this.vy;

        const impactSpeed = dvx * nx + dvy * ny;

        if (impactSpeed > 0) return;

        const impulse = (2 * impactSpeed) / (this.mass + other.mass);

        this.vx -= impulse * other.mass * nx;
        this.vy -= impulse * other.mass * ny;
        other.vx += impulse * this.mass * nx;
        other.vy += impulse * this.mass * ny;
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

        this.resizeCanvas = this.resizeCanvas.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.loop = this.loop.bind(this);

        this.init();
    }

    init() {
        window.addEventListener('resize', this.resizeCanvas);
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

            const startXSim = (this.startX - this.canvas.width / 2) * SCALE;
            const startYSim = -(this.startY - this.canvas.height / 2) * SCALE;

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

    splitBody(body) {
        const numFragments = Math.floor(Math.random() * 2) + 2; // 2 or 3
        const fragments = [];

        for (let i = 0; i < numFragments; i++) {
            const newMass = body.mass / numFragments;
            const newRadius = Math.max(MIN_RADIUS, Math.floor(body.radius / numFragments));

            const newVx = body.vx + (Math.random() * 2000 - 1000);
            const newVy = body.vy + (Math.random() * 2000 - 1000);

            fragments.push(new Body(
                body.x, body.y, newVx, newVy, newMass, newRadius, body.color
            ));
        }
        return fragments;
    }

    handleCollisions(bodies) {
        let newBodies = [];

        for (let i = 0; i < bodies.length; i++) {
            for (let j = 0; j < bodies.length; j++) {
                if (i !== j && !bodies[i].dead && !bodies[j].dead) {
                    if (bodies[i].collidesWith(bodies[j])) {
                        const b1 = bodies[i];
                        const b2 = bodies[j];

                        if (b1.radius <= MIN_RADIUS && b2.radius <= MIN_RADIUS) {
                            b1.bounceOff(b2);
                        } else {
                            // Push apart
                            const dist = b1.distanceTo(b2);
                            const overlap = (b1.radius * SCALE + b2.radius * SCALE) - dist;

                            if (overlap > 0) {
                                const pushDist = overlap / 2;
                                const dx = (b1.x - b2.x) / dist;
                                const dy = (b1.y - b2.y) / dist;

                                b1.x += pushDist * dx;
                                b1.y += pushDist * dy;
                                b2.x -= pushDist * dx;
                                b2.y -= pushDist * dy;
                            }

                            b1.dead = true;
                            b2.dead = true;

                            if (b1.radius > MIN_RADIUS && b1.mass > MIN_MASS) {
                                newBodies.push(...this.splitBody(b1));
                            }
                            if (b2.radius > MIN_RADIUS && b2.mass > MIN_MASS) {
                                newBodies.push(...this.splitBody(b2));
                            }
                        }
                    }
                }
            }
        }

        return bodies.filter(b => !b.dead).concat(newBodies);
    }

    loop() {
        if (!this.isRunning) return;

        // Clear
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

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
            body.draw(this.ctx, this.canvas.width, this.canvas.height);
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
