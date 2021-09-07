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
  ll  
 l  l
  ll 
llllll
 llll
ll  ll
`
]

const G = {
	WIDTH: 150,
	HEIGHT: 150,

	PLAYER_FIRE_RATE: 30,
	PLAYER_SHOW_LASER: true,
	LONGPRESS_THRESHOLD: 20,

    FBULLET_SPEED: 3,

	Z_INIT_NB: 5,
	Z_MAX_NB: 50,
	Z_SPD_MIN: 0.1,
	Z_SPD_MAX: 0.5,
	Z_SPD_RATE: 0.3,
	Z_SPAWN_DISTANCE: 0.8,
	Z_SPAWN_RATE: 30,

	AGGRO_MIN: 0.1,
	AGGRO_MAX: 0.5,
	AGGRO_UPDATE_RATE: 0.01,
	AGGRO_COOLDOWN_RATE: 0.01,
	AGGRO_SHOOT_INCR: 0.2,
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
 * }} FBullet
 */

/**
 * @type { FBullet [] }
 */
let fBullets

let lastJustPressed

function isOutsideScreen(pos) {
	return pos.y < 0
		|| pos.y > G.HEIGHT
		|| pos.x < 0
		|| pos.x > G.WIDTH
}

function generateZombie() {
	const angle = rnd(2*PI)
	const distance = rnd(G.Z_SPAWN_DISTANCE, 1.0) * (G.WIDTH / 2)
	let pos = vec(distance, 0).rotate(angle).add(G.WIDTH * 0.5, G.HEIGHT * 0.5)
	pos.clamp(0, G.WIDTH, 0, G.HEIGHT)
	return { pos: pos, is_aggro: false }
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
	let spd = G.Z_SPD_MIN + (difficulty - 1) * G.Z_SPD_RATE
	if(spd > G.Z_SPD_MAX) spd = G.Z_SPD_MAX
	return spd
}

function update() {
    // The init function running at startup
	if (!ticks) {
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

        fBullets = []
	}

    // Debug
	color("light_black")
	text(zombies.length.toString(), 3, 10)

	// Player
	update_player()

	// Bullets
	update_bullets()

	// Zombies
	update_zombies()
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

	// Laser
	if(G.PLAYER_SHOW_LASER) {
		color ("light_red")
		const p = vec(G.WIDTH * 2, 0).rotate(player.pos.angleTo(input.pos))
		line(player.pos.x, player.pos.y, player.pos.x + p.x, player.pos.y + p.y, 1)
	}
}

function fireSingle() {
	if (player.firingCooldown > 0) return

	let dir = player.pos.angleTo(input.pos)
	fBullets.push({
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
	play("laser")
}

function startBurst() {
	if (player.firingCooldown <= 0) {
		player.burstTicks = 30
		player.firingCooldown = player.burstTicks + G.PLAYER_FIRE_RATE * 3
	}
}

function fireBurst() {
	let dir = player.pos.angleTo(input.pos)
	fBullets.push({
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
	play("laser")
}

function update_bullets() {
	remove(fBullets, (fb) => {
		let upd = vec(G.FBULLET_SPEED, 0).rotate(fb.dir)
		fb.pos.x += upd.x
		fb.pos.y += upd.y
		
		color("yellow")
		bar(fb.pos.x, fb.pos.y, 3, 2, fb.dir)

		return isOutsideScreen(fb.pos)
	})
}

function update_zombies() {
	const aggro_dist = aggro_distance(player.aggroZone)
	remove(zombies, (z) => {
		if(player.pos.distanceTo(z.pos) < aggro_dist && ! z.is_aggro) {
			z.is_aggro = true
			play("lucky")
		}

		if(z.is_aggro) {
			const dir = z.pos.angleTo(player.pos)
			z.pos.add(vec(zombie_speed(), 0).rotate(dir))
			color("light_red")
		} else {
			z.pos.y += rnds(zombie_speed())
			z.pos.x += rnds(zombie_speed())
			color("green")
		}
        z.pos.clamp(0, G.WIDTH, 0, G.HEIGHT)

		const col = char("b", z.pos)

        const isCollidingWithFBullets = col.isColliding.rect.yellow
        if (isCollidingWithFBullets) {
            color("red")
            particle(z.pos)
			play("hit")
			addScore(1)
        }

		const isCollidingWithPlayer = col.isColliding.char.a
		if (isCollidingWithPlayer) end()
        
        // Also another condition to remove the object
        return (isCollidingWithFBullets || isOutsideScreen(z.pos))
    })
	if (ticks % G.Z_SPAWN_RATE == 0 && zombies.length < G.Z_MAX_NB) {
		zombies.push(generateZombie())
    }
}
