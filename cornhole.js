import { defs, tiny } from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Matrix, Mat4, Light, Shape, Material, Scene, Texture,
} = tiny;

const { Cube, Axis_Arrows, Textured_Phong } = defs

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
            regular_2D_polygon: new defs.Regular_2D_Polygon(30, 30),
            cylinder: new defs.Cylindrical_Tube(8, 8),
        };

        // *** Materials
        this.materials = {
            plastic: new Material(new defs.Phong_Shader(),
                { ambient: .4, diffusivity: .6, color: hex_color("#ffffff") }),
            floor: new Material(new defs.Phong_Shader(),
                { ambient: .4, diffusivity: .4, specularity: 0, color: color(.6, 1, .6, 1) }),
            hole: new Material(new defs.Phong_Shader(),
                { ambient: .4, diffusivity: .4, color: color(1, 0, 0, 1) }),
            leaves: new Material(new defs.Phong_Shader(),
                { ambient: .4, diffusivity: .4, specularity: 0, color: color(.4, .8, .4, 1) }),
            traj: new Material(new defs.Phong_Shader(),
                { ambient: .4, diffusivity: .4, color: color(1, 1, 1, .1) }),
            trunk: new Material(new defs.Phong_Shader(),
                { ambient: .4, diffusivity: .4, specularity: 0, color: color(.8, .6, .4, 1) }),
            sky: new Material(new defs.Phong_Shader(),
                { ambient: 1, color: color(.4, .6, .8, 1) }),
            beanbag: new Material(new Textured_Phong(), {
                color: hex_color("#000000"),
                ambient: 1, specularity: 0,
                texture: new Texture("assets/red_wool.png")
            }),
            wood: new Material(new Textured_Phong(), {
                color: hex_color("#000000"),
                ambient: 1, diffusivity: 0, specularity: .2,
                texture: new Texture("assets/oak_planks.png")
            }),
        };

        this.ready = true;
        this.curr_t = 0;
        this.freeze = false;

        this.angle = 0;
        this.angle_change = 0;
        this.power = 28;
        this.power_change = 0;

        this.vel = vec3(0, 0, 0);
        this.beanbag_vel = vec3(0, 0, 0);
        this.pos = vec3(0, 0, 0);
        this.beanbag_pos = vec3(0, 0, 0);
        this.beanbag_rot = 0;

        this.init_pos = vec3(0, 5, 0);
        this.acc = vec3(0, -32.17, 0); // ft/s^2

        this.score = 0;
        this.time = 60;
        this.placeholder = -60;
        this.tree_x_pos = [-40, -30, -20, -10, 0, 10, 20, 30, 40];
        this.tree_z_pos = [];
        this.tree_scale = [];
        for (let i = 0; i < this.tree_x_pos.length; i++) {
            this.tree_x_pos[i] += Math.random() * 6 - 3;
            this.tree_z_pos.push(Math.random() * 10 - 65);
            this.tree_scale.push(Math.random() * .7 + 1.3);
        }

        this.random_loc = -1;
        this.z_value = -20;
        this.angle_v = 0;
        this.random_locT = 0;
        this.z_valueT = 0;
        this.rot_x = 0;
        this.rot_y = 0;
        this.angle_t = 0;
        this.target_loc = 0;
        this.TLcorner = 0;
        this.TRcorner = 0;
        this.BLcorner = 0;
        this.BRcorner = 0;
    }

    make_control_panel() {
        this.live_string(box => {
            box.textContent = "Score: " + this.score + " points";
        });
        this.new_line();
        this.live_string(box => {
            box.textContent = "Time: " + this.time + " seconds";
        });
        this.new_line();
        this.new_line();
        this.key_triggered_button("Aim Left", ["ArrowLeft"], () => this.angle_change = -.005, undefined, () => this.angle_change = 0);
        this.key_triggered_button("Aim Right", ["ArrowRight"], () => this.angle_change = .005, undefined, () => this.angle_change = 0);
        this.new_line();
        this.key_triggered_button("More Power", ["ArrowUp"], () => this.power_change = .1, undefined, () => this.power_change = 0);
        this.key_triggered_button("Less Power", ["ArrowDown"], () => this.power_change = -.1, undefined, () => this.power_change = 0);
        this.new_line();
        this.new_line();
        this.key_triggered_button("Throw", ["c"], () => {
            if (this.ready && this.time > 0) {
                this.ready = false;
                this.curr_t = 0;
                this.beanbag_vel = this.vel;
                this.point = true;
            }
        });
        this.key_triggered_button("Freeze Bag", ["v"], () => { if (!this.ready) { this.freeze = !this.freeze; } });
        this.key_triggered_button("Bag Cam", ["b"], () => this.attached = () => this.bagCam);
        this.key_triggered_button("Start Timer & Reset Score", ["m"], () => {
            this.score = 0;
            this.time = 60;
            this.placeholder = 0;
            this.randomTarget();
            console.log(this.BLcorner, this.BRcorner, this.TRcorner, this.TLcorner)
        });
    }

    randomTarget(){
        this.random_loc = Math.floor(Math.random() * (12 - (-12) + 1) + (-12));
        this.z_value = Math.floor(Math.random() * ((-35) - (-15) + 1) + (-15));
        if (this.random_loc < 0) {
            this.angle_v = 1.5 + Math.abs(this.random_loc) * .02857143
        } else {
            this.angle_v = 1.5 - Math.abs(this.random_loc) * .02857143
        }
        if (this.random_loc == 15 || this.random_loc == 14) {
            this.z_value = -(this.random_loc) - 1;
        } else if(this.random_loc == -35 || this.random_loc == -14) {
            this.z_value = this.random_loc + 1;
        }
        this.random_locT = this.random_loc;
        this.z_valueT = this.z_value;
        if (this.random_locT < -1) {
            this.z_valueT -= 1.75
            this.rot_y = .55 - Math.abs(this.random_locT) * .01549296
            this.rot_x = -1.9 - Math.abs(this.random_locT) * .05070423
            this.angle_t = 1.4 - Math.abs(this.random_locT) * .03943662
        } else {
            this.random_locT += 1.5;
            this.rot_y = -.55 + Math.abs(this.random_locT) * .01486486
            this.rot_x = -1.9 - Math.abs(this.random_locT) * .04864865
            this.angle_t = 1.4 - Math.abs(this.random_locT) * .03783784
        }
        if (this.z_value > 13.5){
            this.rot_y = -.55 + Math.abs(this.random_locT) * .01486486
        }
    }

    generate_tree(context, program_state, pos, scale) {
        let leaves_transform = Mat4.identity().times(Mat4.translation(pos[0], pos[1] + scale[1] * 3, pos[2]))
            .times(Mat4.scale(scale[0], scale[1], scale[2]));
        this.shapes.sphere.draw(context, program_state, leaves_transform, this.materials.leaves);

        let trunk_transform = Mat4.identity().times(Mat4.translation(pos[0], pos[1] + scale[1], pos[2]))
            .times(Mat4.scale(scale[0] / 3, scale[1] * 3, scale[2] / 3))
            .times(Mat4.rotation(Math.PI / 2, 1, 0, 0));
        this.shapes.cylinder.draw(context, program_state, trunk_transform, this.materials.trunk);
    }

    display(context, program_state) {
        // display():  Called once per frame of animation. Here, the base class's display only does
        // some initial setup.

        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            //this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(Mat4.identity().times(Mat4.translation(0, -8, -14)).times(Mat4.rotation(.45, 1, 0, 0)));
        }
        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, 1, 100);

        if (!this.freeze) this.curr_t += dt;

        // *** Lights: *** Values of vector or point lights.
        const light_position = vec4(0, 30, 0, 1);
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 10000)];

        // Sky
        let sky_transform = Mat4.identity().times(Mat4.translation(0, 0, -30)).times(Mat4.scale(60, 60, 40));
        this.shapes.cube.draw(context, program_state, sky_transform, this.materials.sky);

        // Floor
        let floor_transform = Mat4.identity().times(Mat4.translation(0, 0, -30)).times(Mat4.scale(60, .1, 40));
        this.shapes.cube.draw(context, program_state, floor_transform, this.materials.floor);

        // Trees
        for (let i = 0; i < this.tree_x_pos.length; i++) {
            this.generate_tree(context, program_state, vec3(this.tree_x_pos[i], 0, this.tree_z_pos[i]), vec3(this.tree_scale[i], this.tree_scale[i], this.tree_scale[i]));
        }

        // Time Pass
        if (this.placeholder == 0) {
            this.placeholder = t;
        }
        if (this.time > 0) {
            this.time = 60 - Math.floor(t - this.placeholder);
        }
        else {
            this.placeholder = t;
        }

        // Bean Bag
        if (this.ready) {
            // Angle Limits
            let angle_max = .73;
            let angle_min = -angle_max;
            if (this.angle > angle_max) this.angle = angle_max;
            else if (this.angle < angle_min) this.angle = angle_min;
            else this.angle += this.angle_change;

            // Power Limits
            let power_max = 38;
            let power_min = 18;
            if (this.power > power_max) this.power = power_max;
            else if (this.power < power_min) this.power = power_min;
            else this.power += this.power_change;
        }

        // Physics
        this.vel = vec3(this.power * Math.sin(this.angle), this.power - 20, -1 * this.power * Math.cos(this.angle));
        this.pos = this.init_pos.plus(this.vel.times(this.curr_t)).plus(this.acc.times(.5 * this.curr_t * this.curr_t));
        this.beanbag_pos = this.init_pos.plus(this.beanbag_vel.times(this.curr_t)).plus(this.acc.times(.5 * this.curr_t * this.curr_t));

        if (this.beanbag_pos[1] < -8) {
            this.ready = true;
            this.beanbag_rot = 0;
        }

        let beanbag_transform = Mat4.identity().times(Mat4.translation(this.init_pos[0], this.init_pos[1], this.init_pos[2]));
        if (!this.ready) {
            beanbag_transform = Mat4.identity().times(Mat4.translation(this.beanbag_pos[0], this.beanbag_pos[1], this.beanbag_pos[2]));
            this.beanbag_rot += .05;
        }
        beanbag_transform = beanbag_transform.times(Mat4.rotation(this.beanbag_rot, 1, 0, 0));
        beanbag_transform = beanbag_transform.times(Mat4.scale(.8, .3, .8));

        let beanbag_color = color(.8, .4, .4, 1);
        this.shapes.sphere.draw(context, program_state, beanbag_transform, this.materials.beanbag);
        this.bagCam = beanbag_transform;


        // **BOARD**
        let board_transform = Mat4.identity()
        //Finding Board Position
        board_transform = board_transform
            .times(Mat4.translation(this.random_loc, 1, this.z_value))
            .times(Mat4.rotation(1.56, 0, 1, 0))
            .times(Mat4.rotation(1.8, 0, 0, 1))
            .times(Mat4.translation(-1.3, 1, 0))
        this.shapes.cube.draw(context, program_state, board_transform, this.materials.wood) // BOTTOM LEFT BLOCK
        this.BLcorner = board_transform;
        //Adding extra cubes to finish board
        board_transform = board_transform
            .times(Mat4.translation(0, -2, 0))
        this.shapes.cube.draw(context, program_state, board_transform, this.materials.wood)
        board_transform = board_transform
            .times(Mat4.translation(0, -2, 0))
        this.shapes.cube.draw(context, program_state, board_transform, this.materials.wood) // TOP LEFT BLOCK
        this.TLcorner = board_transform;
        board_transform = board_transform
            .times(Mat4.translation(0, 4, 2))
        this.shapes.cube.draw(context, program_state, board_transform, this.materials.wood) // TOP RIGHT BLOCK
        this.TRcorner = board_transform;
        board_transform = board_transform
            .times(Mat4.translation(0, -2, 0))
        this.shapes.cube.draw(context, program_state, board_transform, this.materials.wood)
        board_transform = board_transform
            .times(Mat4.translation(0, -2, 0))
        this.shapes.cube.draw(context, program_state, board_transform, this.materials.wood) // BOTTOM RIGHT BLOCK
        this.BRcorner = board_transform;

        //TARGET LOCATION
        let target_transform = Mat4.identity()

        target_transform = target_transform
            .times(Mat4.translation(this.random_loc + 1, 1.1, this.z_value + -1.5))
            .times(Mat4.rotation(-1.8, -0.1, -0, 0));

        this.target_loc = [this.random_loc + 1, 1.1, this.z_value + -1.5];
        this.shapes.regular_2D_polygon.draw(context, program_state, target_transform, this.materials.hole)

        // CAM STUFF
        this.bag = this.pos;
        this.bagCam = Mat4.inverse(beanbag_transform.times(Mat4.translation(0, 0, 5)));
        if (this.attached != undefined) {
            program_state.camera_inverse = this.attached().map((x, i) => Vector.from(program_state.camera_inverse[i]).mix(x, 0.1));
        }

        let ycollision = (this.beanbag_pos[1] <= 1.4 && this.beanbag_pos[1] >= 0.8);
        let collision = Math.abs(Math.sqrt((this.beanbag_pos[0] - this.target_loc[0]) ** 2 + (this.beanbag_pos[2] - this.target_loc[2]) ** 2))

        if ((collision <= 1) && ycollision && this.point) {
            this.score += 3;
            this.point = false;
            this.randomTarget();
            this.ready = true;
            this.beanbag_rot = 0;
        }

        let boardycollision = (this.beanbag_pos[1] <= this.TLcorner[1][3] && this.beanbag_pos[1] >= this.BLcorner[1][3]);
        let boardcollision = (this.beanbag_pos[0] <= this.TRcorner[0][3] && this.beanbag_pos[0] >= this.TLcorner[0][3] 
                            && this.beanbag_pos[2] <= this.BLcorner[2][3] && this.beanbag_pos[2] >= this.TLcorner[2][3]);

        if (boardcollision && boardycollision && this.point) {
            this.score += 1;
            this.point = false;
            this.randomTarget();
            this.ready = true;
            this.beanbag_rot = 0;
        }

        // Bean Bag Trajectory (Aim)
        for (let i = 0; i < 1.4; i += .05) {
            let traj_pos = this.init_pos.plus(this.vel.times(i)).plus(this.acc.times(.5 * i * i));

            let traj_transform = Mat4.identity().times(Mat4.translation(traj_pos[0], traj_pos[1], traj_pos[2]))
                .times(Mat4.scale(.2, .2, .2));
            this.shapes.sphere.draw(context, program_state, traj_transform, this.materials.traj);
        }
    }
}
