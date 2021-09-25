title = "STICKY GOLF"

description = `
A poorly made golf game
`

characters = [
`
 llll
llllll
llllll
llllll
llllll
 llll
`
]

const G = {
	WIDTH: 400,
	HEIGHT: 200,
	GRAVITY: 0.01,
	TIMESTEP: 1.0,
	BOUNCINESS: 0.5,
	STOP_VELOCITY: 0.1,

	SEG_THICKNESS: 3,
	SEG_MIN_LENGTH: 10,
	SEG_MAX_LENGTH: 50,
	SEG_MAX_HEIGHT_CHANGE: 30,

	GOAL_WIDTH: 20,
	GOAL_DEPTH: 20,
}

options = {
	viewSize: {x: G.WIDTH, y: G.HEIGHT},
}

/**
 * @typedef {{
 * p: Vector
 * v: Vector
 * }} Ball
 */

/**
 * @type { Ball }
 */
let b

/**
 * @typedef {{
 * x1: number
 * y1: number
 * x2: number
 * y2: number
 * goal: boolean
 * }} Segment
 */

/**
 * @type { Segment [] }
 */
let segs

let new_accel

let aiming

let prevCol

let goalX
let goalY

function update() {
    // The init function running at startup
	if (!ticks) {
        init()
	}

    // text(floor(b.p.x).toString() + "," + floor(b.p.y).toString(), 3, 10)
	// text(b.v.y.toString(), 3, 20)

    updateBall()

	renderSegments()

	if(aiming) updateAim()
}

function init() {
	generate_segments()

	b = {
		p: vec(G.WIDTH * 0.1, segs[0].y1 - 5),
		v: vec(0, 0),
	}

	aiming = true

	prevCol = null

	new_accel = vec(0, 0)

	score = 10
}

function generate_segments() {
	let old_x = 0, old_y = G.HEIGHT * 0.8
	let goalPlaced = false

	segs = []

	for (
		let x = G.SEG_MAX_LENGTH, y = old_y;
		old_x < G.WIDTH;
		x += rnd(G.SEG_MIN_LENGTH, G.SEG_MAX_LENGTH),
		y += rnds(G.SEG_MAX_HEIGHT_CHANGE)
	) {
		y = clamp(y, 0.1 * G.HEIGHT, 0.9 * G.HEIGHT)

	    if(x > G.WIDTH * 0.8 && ! goalPlaced) {
			// Goal "bucket" segments
			goalX = old_x
			goalY = old_y + G.GOAL_DEPTH

			segs.push({
				x1: goalX,
				y1: old_y,
				x2: goalX,
				y2: goalY,
				goal: false
			})
			segs.push({
				x1: goalX,
				y1: goalY,
				x2: goalX + G.GOAL_WIDTH,
				y2: goalY,
				goal: true
			})
			segs.push({
				x1: goalX + G.GOAL_WIDTH,
				y1: goalY,
				x2: goalX + G.GOAL_WIDTH,
				y2: old_y,
				goal: true
			})
			x = goalX + 20
			y = old_y

			goalPlaced = true
		} else {
			// Regular segments
			segs.push({
				x1: old_x,
				y1: old_y,
				x2: x,
				y2: y,
				goal: false
			})
		}

		old_x = x
		old_y = y
	}
}

function updateBall() {
	if(! aiming) {
		let accel = new_accel
		accel.addWithAngle(0.5 * PI, G.GRAVITY)
		b.p = b.p.add(b.v.mul(G.TIMESTEP))
		b.v = b.v.add(accel.mul(G.TIMESTEP))
		new_accel = vec(0, 0)

		if(b.p.x <= 0 || b.p.x >= G.WIDTH) {
			score = 0
			end()
		}
	}

	color(b.v.length > G.STOP_VELOCITY ? "black": "light_black")
	char("a", b.p)
}

function renderSegments() {
	let newAngle = null
	let lastCol = null

	segs.forEach((s) => {
		color("black")
		let col = line(s.x1, s.y1, s.x2, s.y2, G.SEG_THICKNESS)
		if(! aiming && col.isColliding.char.a && col != prevCol) {
			color("cyan")
			line(s.x1, s.y1, s.x2, s.y2, G.SEG_THICKNESS)

			const sAngle = vec(s.x2, s.y2).angleTo(vec(s.x1, s.y1))
			const vAngle = vec(0,0).angleTo(b.v)
			newAngle = vAngle - 2 * ( vAngle - sAngle )
			lastCol = col
			prevCol = col
		}
	});

    if(newAngle != null) {
		b.v = vec(b.v.length * G.BOUNCINESS).rotate(newAngle)
		if(b.v.length <= G.STOP_VELOCITY) {
			if(ballIsInGoalBucket()) {
				end("You won !")
			} else {
				// raise ball to avoid getting stuck in floor
				b.p.y -= 1
				aiming = true
			}
		}
	}
}

function ballIsInGoalBucket() {
	const margin = 3
	return (
		b.p.x >= goalX + margin && b.p.x <= goalX + G.GOAL_WIDTH - margin &&
     	b.p.y >= goalY - G.GOAL_DEPTH + margin && b.p.y <= goalY
	)
}

function updateAim() {
	color("cyan")
	line(b.p.x, b.p.y, input.pos.x, input.pos.y, 1)
	if(input.isJustPressed) {
		const force = 0.01
		new_accel = vec(force * (input.pos.x - b.p.x), force * (input.pos.y - b.p.y))
		score -= 1
		if(score <= 0) end()
		aiming = false
	}
}