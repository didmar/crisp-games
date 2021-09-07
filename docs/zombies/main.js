title = "ZOMBIES"

description = `
Shoot zombies to survive
[Tap] Single shot
[Hold] Burst shot
`

characters = [
`
  ll  
 llll
  ll 
llllll
 llll
ll  ll
`,
`
 lll
l l l
 lll
llllll
 llll
ll  ll
`,
`
  lll 
 l l l
  lll
llllll
 llll
ll  ll
`,
]

/**
 * Value that increases from min to max at the speed of rate per second
 * @typedef {{
 * min: number
 * max: number
 * rate: number
 * }} Gauge
 */

const G = {
	WIDTH: 150,
	HEIGHT: 150,

	PLAYER_FIRE_RATE: 30,
	PLAYER_SHOW_LASER: true,
	LONGPRESS_THRESHOLD: 20,

	NIGHT_TIME: true,
	NIGHT_FOV: PI/4,

    BULLET_SPEED: 3,

	Z_INIT_NB: 15,
	Z_MAX_NB: 50,
	Z_SPD: {
		min: 0.1,
		max: 0.5,
		rate: 0.0013333, // reach max after ~5 min
	},
	Z_SPAWN_DISTANCE: 0.8,
	Z_SPAWN_RATE: 30,

	/**
	 * @type Gauge
	 */
	Z_SPAWN_AGGRO_PROBA: {
		min: 0.0,
	    max: 0.2,
	    rate: 0.0007, // reach max after ~5 min
	},

	AGGRO_MIN: 0.1, // % of the screen width
	AGGRO_MAX: 0.5,
	AGGRO_UPDATE_RATE: 0.01,
	AGGRO_COOLDOWN_RATE: 0.01,
	AGGRO_SHOOT_INCR: 0.2,

	/**
	 * @type SoundEffectType
	 */
	AGGRO_SOUND: "jump",
	/**
	 * @type SoundEffectType
	 */
	FIRING_SOUND: "laser",
	/**
	 * @type SoundEffectType
	 */
	BULLET_HIT_SOUND: "hit",
}

options = {
	viewSize: {x: G.WIDTH, y: G.HEIGHT},
	isReplayEnabled: true,
	theme: "crt",
	// isCapturing: true,
	// isCapturingGameCanvasOnly: true,
	// captureCanvasScale: 2,
}

/**
* @typedef {{
* pos: Vector
* is_aggro: boolean
* }} Zombie
*/

/**
* @type  { Zombie [] }
*/
let zombies

/**
 * @typedef {{
 * targetSize: number
 * currentSize: number
 * }} AggroZone
 */

/**
 * @typedef {{
 * pos: Vector,
 * firingCooldown: number
 * burstTicks: number
 * aggroZone: AggroZone
 * }} Player
 */

/**
 * @type { Player }
 */
let player

/**
 * @typedef {{
 * pos: Vector
 * dir: number
 * }} Bullet
 */

/**
 * @type { Bullet [] }
 */
let bullets

let lastJustPressed

function update() {
    // The init function running at startup
	if (!ticks) {
        init()
	}

    // Debug
	color("light_black")
	text(zombies.length.toString(), 3, 10)
	// text(spawn_aggro_proba().toString(), 3, 20)

	// Player
	update_player()

	// Bullets
	update_bullets()

	// Zombies
	update_zombies()
}

function init() {
	zombies = times(G.Z_INIT_NB, generateZombie)

	player = {
		pos: vec(G.WIDTH * 0.5, G.HEIGHT * 0.5),
		firingCooldown: G.PLAYER_FIRE_RATE,
		burstTicks: 0,
		aggroZone: {
			currentSize: G.AGGRO_MIN,
			targetSize: G.AGGRO_MIN,
		}
	}

	bullets = []
}


function update_player() {
	// AggroZone
    color("light_black")
	update_aggro_zone(player.aggroZone)
	const aggro_dist = aggro_distance(player.aggroZone)
	arc(player.pos.x, player.pos.y, aggro_dist, 1, 0, 2*PI)

	// player.pos.clamp(0, G.WIDTH, 0, G.HEIGHT)

	player.firingCooldown--
	player.burstTicks--

	let isPassingThreshold = ticks - lastJustPressed > G.LONGPRESS_THRESHOLD;

    if (input.isJustPressed) {
		lastJustPressed = ticks;
	} else if (input.isPressed) {
        
	} else if (input.isJustReleased) {
		if (isPassingThreshold) startBurst()
		else fireSingle()
	}

	if (player.burstTicks > 0) {
		if(player.burstTicks % 10 == 0) {
			fireBurst()
		}
	}

	color(player.firingCooldown <= 0 ? "black" : "light_black")
	char("a", player.pos)

	const aimAngle = player.pos.angleTo(input.pos)

	// Flashlight
	if(G.NIGHT_TIME) {
		color("light_yellow")
		if(floor(ticks / 1) % 2 == 0) {
		for (let dist = 0; dist < G.WIDTH / 2; dist += 10) {
			arc(
				player.pos.x,
				player.pos.y,
				dist,
				1,
				aimAngle - G.NIGHT_FOV * 0.5,
				aimAngle + G.NIGHT_FOV * 0.5
			)
		}
		}
	}
	// Laser
	if(G.PLAYER_SHOW_LASER) {
		color ("light_red")
		const p = vec(0, 0).addWithAngle(aimAngle, G.WIDTH * 2)
		line(player.pos.x, player.pos.y, player.pos.x + p.x, player.pos.y + p.y, 1)
	}
}


function fireSingle() {
	if (player.firingCooldown > 0) return

	let dir = player.pos.angleTo(input.pos)
	bullets.push({
		pos: vec(player.pos.x, player.pos.y),
		dir: dir,
	})
	player.firingCooldown = G.PLAYER_FIRE_RATE
	player.aggroZone.targetSize += G.AGGRO_SHOOT_INCR

	color("light_black")
	particle(
		player.pos.x,
		player.pos.y,
		4,
		1,
		dir,
		PI/4
	)
	play(G.FIRING_SOUND)
}

function startBurst() {
	if (player.firingCooldown <= 0) {
		player.burstTicks = 30
		player.firingCooldown = player.burstTicks + G.PLAYER_FIRE_RATE * 3
	}
}

function fireBurst() {
	let dir = player.pos.angleTo(input.pos)
	bullets.push({
		pos: vec(player.pos.x, player.pos.y),
		dir: dir + rnds(PI/16),
	})
	player.firingCooldown = G.PLAYER_FIRE_RATE
	player.aggroZone.targetSize += G.AGGRO_SHOOT_INCR

	color("red")
	particle(
		player.pos.x,
		player.pos.y,
		4,
		1,
		dir,
		PI/4
	)
	play(G.FIRING_SOUND)
}

function update_bullets() {
	remove(bullets, (b) => {
		b.pos.addWithAngle(b.dir, G.BULLET_SPEED)
		
		color("yellow")
		bar(b.pos.x, b.pos.y, 3, 2, b.dir)

		return isOutsideScreen(b.pos)
	})
}


function update_zombies() {
	const spd = zombie_speed()
	const aggro_dist = aggro_distance(player.aggroZone)
	remove(zombies, (z) => {
		if(player.pos.distanceTo(z.pos) < aggro_dist && ! z.is_aggro) {
			z.is_aggro = true
			play(G.AGGRO_SOUND)
		}

		if(z.is_aggro) {
			const dir = z.pos.angleTo(player.pos)
			z.pos.addWithAngle(dir, spd)
			color("light_red")
		} else {
			z.pos.addWithAngle(rnd(2*PI), spd)
			color("green")
		}
        z.pos.clamp(0, G.WIDTH, 0, G.HEIGHT)

		if(! is_visible(z.pos)) {
			color("white")  // will appear black on black background
		}

		const offset = floor(ticks / (spd * 300)) % 2
		const col = char(addWithCharCode("b", offset), z.pos)

        const isCollidingWithBullets = col.isColliding.rect.yellow
        if (isCollidingWithBullets) {
            color("red")
            particle(z.pos)
			play(G.BULLET_HIT_SOUND)
			addScore(1)
        }

		const isCollidingWithPlayer = col.isColliding.char.a
		if (isCollidingWithPlayer) end()
        
        // Also another condition to remove the object
        return (isCollidingWithBullets || isOutsideScreen(z.pos))
    })
	if (ticks % G.Z_SPAWN_RATE == 0 && zombies.length < G.Z_MAX_NB) {
		zombies.push(generateZombie())
    }
}

function is_visible(pos) {
	if(! G.NIGHT_TIME) return true
	let objAngle = player.pos.angleTo(pos)
	const aimAngle = player.pos.angleTo(input.pos)
	return abs(aimAngle - objAngle) < G.NIGHT_FOV
}

function generateZombie() {
	const angle = rnd(2*PI)
	const distance = rnd(G.Z_SPAWN_DISTANCE, 1.0) * (G.WIDTH / 2)
	let pos = vec(G.WIDTH * 0.5, G.HEIGHT * 0.5).addWithAngle(angle, distance)
	pos.clamp(0, G.WIDTH, 0, G.HEIGHT)
	const is_aggro = rnd(1) < spawn_aggro_proba()
	if (is_aggro) play(G.AGGRO_SOUND)
	return { pos: pos, is_aggro: is_aggro }
}

function spawn_aggro_proba() {
	return scale_with_difficulty(G.Z_SPAWN_AGGRO_PROBA)
}

function aggro_distance(aggroZone) {
	let _size = aggroZone.currentSize
	if(_size > G.AGGRO_MAX) _size = G.AGGRO_MAX
	return _size * G.WIDTH
}

function update_aggro_zone(aggroZone) {
	if(aggroZone.targetSize > G.AGGRO_MIN) {
		aggroZone.targetSize -= G.AGGRO_COOLDOWN_RATE
	}
    aggroZone.currentSize +=
		(aggroZone.targetSize - aggroZone.currentSize) * G.AGGRO_UPDATE_RATE
}

function zombie_speed() {
	return scale_with_difficulty(G.Z_SPD)
}


// Generic utils

function scale_with_difficulty(gauge) {
	let value = gauge.min + (difficulty - 1) * (gauge.rate * 60)
	if(value > gauge.max) value = gauge.max
	return value
}

function isOutsideScreen(pos) {
	return pos.y < 0
		|| pos.y > G.HEIGHT
		|| pos.x < 0
		|| pos.x > G.WIDTH
}