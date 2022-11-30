import { defs, tiny } from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Matrix, Mat4, Light, Shape, Material, Scene,
} = tiny;

export class Cornhole extends Scene {
    /**
     *  **Base_scene** is a Scene that can be added to any display canvas.
     *  Setup the shapes, materials, camera, and lighting here.
     */
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            cube: new defs.Cube(),
            sphere: new defs.Subdivision_Sphere(4),
            regular_2D_polygon: new defs.Regular_2D_Polygon(30, 30)
        };

        // *** Materials
        this.materials = {
            plastic: new Material(new defs.Phong_Shader(),
                { ambient: .4, diffusivity: .6, color: hex_color("#ffffff") }),
            wood: new Material(new defs.Phong_Shader(),
                { ambient: .4, diffusivity: .6, color: hex_color("#be8c41") }),
            hole: new Material(new defs.Phong_Shader(),
                { ambient: .4, diffusivity: .6, color: color(1, 0, 0, 1) }),
            traj: new Material(new defs.Phong_Shader(),
                { ambient: .4, diffusivity: .6, color: color(1, 1, 1, .1) }),
            traj2: new Material(new defs.Phong_Shader(),
                { ambient: .4, diffusivity: .6, color: color(1, 0, 0, .1) }),
        };

        this.ready = true;
        this.curr_t = 0;
        this.freeze = false;

        this.angle = 0;
        this.angle_change = 0;
        this.power = 25;
        this.power_change = 0;

        this.vel = vec3(0, 0, 0);
        this.beanbag_vel = vec3(0, 0, 0);
        this.pos = vec3(0, 0, 0);
        this.beanbag_pos = vec3(0, 0, 0);

        this.init_pos = vec3(0, 5, 0);
        this.acc = vec3(0, -32.17, 0); // ft/s^2

        this.random_loc = 0;
        this.z_value = 0;
        this.angle_v = 0;
        this.random_locT = 0;
        this.z_valueT = 0;
        this.rot_x = 0;
        this.rot_y = 0;
        this.coc = 0; //center of circle
    }

    make_control_panel() {
        this.key_triggered_button("Aim Left", ["ArrowLeft"], () => this.angle_change = -.005, undefined, () => this.angle_change = 0);
        this.key_triggered_button("Aim Right", ["ArrowRight"], () => this.angle_change = .005, undefined, () => this.angle_change = 0);
        this.new_line();
        this.key_triggered_button("More Power", ["ArrowUp"], () => this.power_change = .1, undefined, () => this.power_change = 0);
        this.key_triggered_button("Less Power", ["ArrowDown"], () => this.power_change = -.1, undefined, () => this.power_change = 0);
        this.new_line();
        this.new_line();
        this.key_triggered_button("Throw", ["c"], () => {
            if (this.ready) {
                this.ready = false;
                this.curr_t = 0;
                this.beanbag_vel = this.vel;
            }
        });
        this.key_triggered_button("Random Target", ["r"], () => {
            this.randomTarget()
        });
        this.key_triggered_button("Start", ["s"], () => {
            this.randomTarget()
        });
        this.key_triggered_button("Freeze Bag", ["v"], () => { if (!this.ready) { this.freeze = !this.freeze; } });
        this.key_triggered_button("Bag Cam", ["b"], () => this.attached = () => this.bagCam);
    }

    randomTarget(){
        this.random_loc = Math.floor(Math.random() * (35 - (-35) + 1) + (-35));
        this.z_value = Math.floor(Math.random() * ((-35) - (-15) + 1) + (-15));
        if (this.random_loc < 0) {
            this.angle_v = 1.5 + Math.abs(this.random_loc) * .02857143
        } else {
            this.angle_v = 1.5 - Math.abs(this.random_loc) * .02857143
        }
        if (this.random_loc == 35 || this.random_loc == 14) {
            this.z_value = -(this.random_loc) - 1;
        } else if(this.random_loc == -35 || this.random_loc == -14) {
            this.z_value = this.random_loc + 1;
        }
        this.random_locT = this.random_loc;
        this.z_valueT = this.z_value;
        if (this.random_locT < 0) {
            this.random_locT;
            this.z_valueT -= 1.5
            this.rot_y = .55 - Math.abs(this.random_locT) * .01549296
            this.rot_x = -1.9 - Math.abs(this.random_locT) * .05070423
        } else {
            this.random_locT += 1.5;
            this.rot_y = -.55 + Math.abs(this.random_locT) * .01486486
            this.rot_x = -1.9 - Math.abs(this.random_locT) * .04864865
        }
    }

    display(context, program_state) {
        // display():  Called once per frame of animation. Here, the base class's display only does
        // some initial setup.

        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            //this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(Mat4.identity().times(Mat4.translation(0, -12, -25)).times(Mat4.rotation(Math.PI / 10, 1, 0, 0)));
        }
        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, 1, 100);

        if (!this.freeze) this.curr_t += dt;

        // *** Lights: *** Values of vector or point lights.
        const light_position = vec4(0, 5, 5, 1);
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 1000)];

        // Floor
        let floor_transform = Mat4.identity().times(Mat4.scale(100, .1, 100));
        let floor_color = color(.4, .8, .4, 1);
        this.shapes.cube.draw(context, program_state, floor_transform, this.materials.plastic.override({ color: floor_color }));

        // Bean Bag
        if (this.ready) {
            // Angle Limits
            let angle_max = .8;
            let angle_min = -.8;
            if (this.angle > angle_max) this.angle = angle_max;
            else if (this.angle < angle_min) this.angle = angle_min;
            else this.angle += this.angle_change;

            // Power Limits
            let power_max = 40;
            let power_min = 15;
            if (this.power > power_max) this.power = power_max;
            else if (this.power < power_min) this.power = power_min;
            else this.power += this.power_change;
        }

        // Physics
        this.vel = vec3(this.power * Math.sin(this.angle), this.power - 20, -1 * this.power * Math.cos(this.angle));
        this.pos = this.init_pos.plus(this.vel.times(this.curr_t)).plus(this.acc.times(.5 * this.curr_t * this.curr_t));
        this.beanbag_pos = this.init_pos.plus(this.beanbag_vel.times(this.curr_t)).plus(this.acc.times(.5 * this.curr_t * this.curr_t));

        if (this.beanbag_pos[1] < -8) this.ready = true// TEMPORARY
        if(this.beanbag_pos[1] <= .5 && this.beanbag_pos[1] >= 0.1) {
            this.randomTarget();
        }


        let beanbag_transform = Mat4.identity().times(Mat4.translation(this.init_pos[0], this.init_pos[1], this.init_pos[2]));
        if (!this.ready) {
            beanbag_transform = Mat4.identity().times(Mat4.translation(this.beanbag_pos[0], this.beanbag_pos[1], this.beanbag_pos[2]));
            beanbag_transform = beanbag_transform.times(Mat4.scale(.8, .8, .8));
        }

        let beanbag_color = color(.8, .4, .4, 1);
        this.shapes.sphere.draw(context, program_state, beanbag_transform, this.materials.plastic.override({ color: beanbag_color }));
        this.bagCam = beanbag_transform;


        // **BOARD**
        let cornhole_x = 10 * Math.sin(t) + 14.6;
        let cornhole_z = 10 * Math.sin(-1 * t) - 16;
        //Finding Board Position

        //RIGHT | MAX RIGHT: X:35 Z:-35 | MIN RIGHT: X:13 Z:-14
        //LEFT | MAX LEFT: X:-35 Z:-35 | MIN LEFT: X:-13 Z:-14
        //MIDDLE 1.55 for angle X:-.9 Z:-55
        // MAX ANGLE LEFT 2.5 TO MIN ANGLE RIGHT .5

            // .times(Mat4.translation(this.random_loc, 1, this.z_value))
            // .times(Mat4.rotation(this.angle_v, 0, 1, 0))

        let board_transform = Mat4.identity();
        board_transform = board_transform
            .times(Mat4.translation(this.random_loc, 1, this.z_value))
            .times(Mat4.rotation(this.angle_v, 0, 1, 0))
            .times(Mat4.rotation(1.8, 0, 0, 1))
            .times(Mat4.translation(-1.3, 1, 0));
        this.shapes.cube.draw(context, program_state, board_transform, this.materials.wood) // BOTTOM LEFT BLOCK
        board_transform = board_transform
            .times(Mat4.translation(0, -2, 0))
        this.shapes.cube.draw(context, program_state, board_transform, this.materials.wood)
        board_transform = board_transform
            .times(Mat4.translation(0, -2, 0))
        this.shapes.cube.draw(context, program_state, board_transform, this.materials.wood) //TOP LEFT BLOCK
        board_transform = board_transform
            .times(Mat4.translation(0, 4, 2))
        this.shapes.cube.draw(context, program_state, board_transform, this.materials.wood) // TOP RIGHT BLOCK
        board_transform = board_transform
            .times(Mat4.translation(0, -2, 0))
        this.shapes.cube.draw(context, program_state, board_transform, this.materials.wood)
        board_transform = board_transform
            .times(Mat4.translation(0, -2, 0))
        this.shapes.cube.draw(context, program_state, board_transform, this.materials.wood) // BOTTOM RIGHT BLOCK


        //TARGET LOCATION
        let target_transform = Mat4.identity()

            // .times(Mat4.translation(this.random_locT, 1.3, this.z_valueT))
            // .times(Mat4.rotation(1.4, -1.9, this.rot_y, 0));

        target_transform = target_transform
            .times(Mat4.translation(this.random_locT, 1.3, this.z_valueT))
            .times(Mat4.rotation(1.4, -1.9, this.rot_y, 0));
        this.shapes.regular_2D_polygon.draw(context, program_state, target_transform, this.materials.hole)

        let target_x = 10 * Math.sin(t) + 17;
        let target_z = 10 * Math.sin(-1 * t) - 17

        // CAM STUFF
        this.bag = this.pos;
        this.bagCam = Mat4.inverse(beanbag_transform.times(Mat4.translation(0, 0, 5)));
        if (this.attached != undefined) {
            program_state.camera_inverse = this.attached().map((x, i) => Vector.from(program_state.camera_inverse[i]).mix(x, 0.1));
        }


        // Scoring
        // let xcollision = (Math.floor(pos[0]) <= target_x + 1.5 && Math.floor(pos[0]) >= target_x - 1.5);
        // let ycollision = (pos[1] <= 1.75 && pos[1] >= 1.25);
        // let zcollision = (Math.floor(pos[2]) <= target_z + 1.5 && Math.floor(pos[2]) >= target_z - 1.5);

        let xcollision = (Math.floor(this.beanbag_pos[0]) <= 2 && Math.floor(this.beanbag_pos[0]) >= -1);
        let ycollision = (this.beanbag_pos[1] <= 1.4 && this.beanbag_pos[1] >= 0.8);
        let zcollision = (Math.floor(this.beanbag_pos[2]) <= -15.5 && Math.floor(this.beanbag_pos[2]) >= -17.5);

        if (xcollision && ycollision && zcollision) {
            console.log(1);
        }


        // Bean Bag Trajectory (Aim)
        for (let i = 0; i < 2; i += .06) {
            let traj_pos = this.init_pos.plus(this.vel.times(i)).plus(this.acc.times(.5 * i * i));

            let traj_transform = Mat4.identity().times(Mat4.translation(traj_pos[0], traj_pos[1], traj_pos[2]))
                .times(Mat4.scale(.2, .2, .2));
            this.shapes.sphere.draw(context, program_state, traj_transform, this.materials.traj);
        }
    }
}
