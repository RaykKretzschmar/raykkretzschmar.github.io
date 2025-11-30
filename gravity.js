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

    updatePosition(fx, fy) {
        this.vx += (fx / this.mass) * TIMESTEP;
        this.vy += (fy / this.mass) * TIMESTEP;
        this.x += this.vx * TIMESTEP;
        this.y += this.vy * TIMESTEP;

        // Update trail every few frames or every frame
        // Since we sub-step, we might want to only add to trail occasionally, but here we add every update call (which is once per sub-step? No, updatePosition is called in loop)
        // Actually, updatePosition is called inside the sub-step loop.
        // We should probably move trail update out of here or just accept high density.
        // Let's just add it.
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

function computeGravitationalForce(b1, b2) {
    const dx = b2.x - b1.x;
    const dy = b2.y - b1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return { fx: 0, fy: 0 };

    const force = (G * b1.mass * b2.mass) / (distance * distance);
    const fx = force * (dx / distance);
    const fy = force * (dy / distance);

    return { fx, fy };
}

function splitBody(body) {
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

function handleCollisions(bodies) {
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
                            newBodies.push(...splitBody(b1));
                        }
                        if (b2.radius > MIN_RADIUS && b2.mass > MIN_MASS) {
                            newBodies.push(...splitBody(b2));
                        }
                    }
                }
            }
        }
    }

    return bodies.filter(b => !b.dead).concat(newBodies);
}

// Setup
const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Initial Bodies
const sun = new Body(0, 0, 0, 0, 1.989e30, 30, 'rgb(255, 255, 0)');
const earth = new Body(1.496e11, 0, 0, 29783, 5.972e24, 10, 'rgb(0, 0, 255)');
let bodies = [sun, earth];

// Interaction State
let isDragging = false;
let startX = 0;
let startY = 0;
let currentX = 0;
let currentY = 0;

canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    currentX = startX;
    currentY = startY;
});

canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
        currentX = e.clientX;
        currentY = e.clientY;
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (isDragging) {
        isDragging = false;
        const endX = e.clientX;
        const endY = e.clientY;

        const startXSim = (startX - canvas.width / 2) * SCALE;
        const startYSim = -(startY - canvas.height / 2) * SCALE;

        // Velocity scaling: 1 pixel drag = 1000 m/s
        const velX = -(endX - startX) * 1000;
        const velY = (endY - startY) * 1000;

        // Increase mass to be significant (1e28 to 1e30) so they attract each other
        const newMass = (Math.random() * (1e30 - 1e28)) + 1e28;
        const newRadius = Math.floor(Math.random() * 11) + 10; // 10 to 20
        const color = `rgb(${Math.floor(Math.random() * 156) + 100}, ${Math.floor(Math.random() * 156) + 100}, ${Math.floor(Math.random() * 156) + 100})`;

        bodies.push(new Body(startXSim, startYSim, velX, velY, newMass, newRadius, color));
    }
});

// Main Loop
function loop() {
    // Clear
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Physics Sub-stepping
    const subSteps = 8; // More stable simulation
    const dt = TIMESTEP / subSteps;

    for (let step = 0; step < subSteps; step++) {
        // 1. Calculate all forces first
        const forces = new Array(bodies.length).fill(null).map(() => ({ fx: 0, fy: 0 }));

        for (let i = 0; i < bodies.length; i++) {
            for (let j = i + 1; j < bodies.length; j++) {
                if (!bodies[i].dead && !bodies[j].dead) {
                    const { fx, fy } = computeGravitationalForce(bodies[i], bodies[j]);

                    forces[i].fx += fx;
                    forces[i].fy += fy;
                    forces[j].fx -= fx; // Newton's 3rd Law: Equal and opposite force
                    forces[j].fy -= fy;
                }
            }
        }

        // 2. Update positions using calculated forces
        for (let i = 0; i < bodies.length; i++) {
            if (!bodies[i].dead) {
                // Temporarily override TIMESTEP in the class method or adjust here
                // Since updatePosition uses global TIMESTEP, we need to adjust it or the method
                // Let's manually update here to use 'dt'
                const body = bodies[i];
                const fx = forces[i].fx;
                const fy = forces[i].fy;

                body.vx += (fx / body.mass) * dt;
                body.vy += (fy / body.mass) * dt;
                body.x += body.vx * dt;
                body.y += body.vy * dt;
            }
        }

        // 3. Handle Collisions
        bodies = handleCollisions(bodies);
    }

    // Draw
    for (const body of bodies) {
        body.draw(ctx, canvas.width, canvas.height);
    }

    // Draw Drag Line
    if (isDragging) {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(currentX, currentY);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    requestAnimationFrame(loop);
}

loop();
