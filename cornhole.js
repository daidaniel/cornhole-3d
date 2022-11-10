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
            regular_2D_polygon: new defs.Regular_2D_Polygon(30,30)
        };

        // *** Materials
        this.materials = {
            plastic: new Material(new defs.Phong_Shader(),
                { ambient: .4, diffusivity: .6, color: hex_color("#ffffff") }),
            wood: new Material(new defs.Phong_Shader(),
                { ambient: .4, diffusivity: .6, color: hex_color("#be8c41") }),
            hole: new Material(new defs.Phong_Shader(),
                { ambient: .4, diffusivity: .6, color: color(1,0,0,1) })
        };

        this.starttime = 0.0;
        this.currenttime = 0.0;
    }

    make_control_panel(){
        this.key_triggered_button("Increase X Velocity by 1", ["1"]);
        this.key_triggered_button("Increase Y Velocity by 1", ["2"]);
        this.key_triggered_button("Increase Z Velocity by 1", ["3"]);
        this.key_triggered_button("Freeze Bag", ["Control", "1"], () => this.attached = () => this.bag);
        this.key_triggered_button("Bag Cam", ["Control", "2"], () => this.attached = () => this.bagCam);
        this.key_triggered_button("Shoot", ["c"], () => {
            this.starttime = this.currenttime;
        });
    }

    display(context, program_state) {
        // display():  Called once per frame of animation. Here, the base class's display only does
        // some initial setup.

        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(Mat4.translation(0, -2, 0));
        }
        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, 1, 100);

        // *** Lights: *** Values of vector or point lights.
        const light_position = vec4(0, 5, 5, 1);
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 1000)];

        // Floor
        let floor_transform = Mat4.identity().times(Mat4.scale(100, .1, 100));
        let floor_color = color(.4, .8, .4, 1);
        this.shapes.cube.draw(context, program_state, floor_transform, this.materials.plastic.override({ color: floor_color }));

        // Cornhole
        let cornhole_color = color(0.6, 0.3, 0, 1);
        let cornhole_x = 10 * Math.sin(t) + 15.5;
        let cornhole_z = 10 * Math.sin(-1 * t) - 15.5
        let cornhole_loc =  Mat4.identity().times(Mat4.translation(cornhole_x, 0.5, cornhole_z));
        this.shapes.cube.draw(context, program_state, cornhole_loc, this.materials.plastic.override({color : cornhole_color}));

        // Bean Bag
        let init_pos = vec3(0, 10, 0);
        let vel = vec3(10, 20, -10);
        let acc = vec3(0, -32.17, 0); // ft/s^2
        let newt = t - this.starttime;
        this.currenttime = t;
        let pos = init_pos.plus(vel.times(newt)).plus(acc.times(.5 * newt * newt));

        let beanbag_transform = Mat4.identity().times(Mat4.translation(pos[0], pos[1], pos[2]));
        let beanbag_color = color(.8, .4, .4, 1);
        this.shapes.sphere.draw(context, program_state, beanbag_transform, this.materials.plastic.override({ color: beanbag_color }));
        this.bagCam = beanbag_transform;

        let xcollision = (Math.floor(pos[0]) <= cornhole_x + 1 && Math.floor(pos[0]) >= cornhole_x - 1);
        let ycollision = (pos[1] <= 0.5 && pos[1] >= 0);
        let zcollision = (Math.floor(pos[2]) <= cornhole_z + 1 && Math.floor(pos[2]) >= cornhole_z - 1);

        if (xcollision && ycollision && zcollision) {
            console.log(1);
        }

        // Bean Bag Trajectory
        let traj_show = true; // "throw" control should turn this off
        let traj_color = color(1, 1, 1, 0);
        if (traj_show) {
            traj_color = color(1, 1, 1, 1);
        }

        for (let i = 0; i < 10; i += .05) {
            let traj_pos = init_pos.plus(vel.times(i)).plus(acc.times(.5 * i * i));

            let traj_transform = Mat4.identity().times(Mat4.translation(traj_pos[0], traj_pos[1], traj_pos[2]))
                .times(Mat4.scale(.3, .3, .3));
            this.shapes.sphere.draw(context, program_state, traj_transform, this.materials.plastic.override({ color: traj_color }));
        }

        // **BOARD**
        let board_transform = Mat4.identity()
        //Finding Board Position
        board_transform = board_transform
            .times(Mat4.translation(15.9,1,-16))
            .times(Mat4.rotation(.8,0,1,0))
            .times(Mat4.rotation(1.8,0,0,1))
            .times(Mat4.translation(-1.3,1,0))
        this.shapes.cube.draw(context, program_state, board_transform, this.materials.wood)


        //Adding extra cubes to finish board
        board_transform = board_transform
            .times(Mat4.translation(0,-2,0))
        this.shapes.cube.draw(context, program_state, board_transform, this.materials.wood)
        board_transform = board_transform
            .times(Mat4.translation(0,-2,0))
        this.shapes.cube.draw(context, program_state, board_transform, this.materials.wood)
        board_transform = board_transform
            .times(Mat4.translation(0,4,2))
        this.shapes.cube.draw(context, program_state,board_transform, this.materials.wood)
        board_transform = board_transform
            .times(Mat4.translation(0,-2,0))
        this.shapes.cube.draw(context, program_state, board_transform, this.materials.wood)
        board_transform = board_transform
            .times(Mat4.translation(0,-2,0))
        this.shapes.cube.draw(context, program_state, board_transform, this.materials.wood)

        //TARGET LOCATION
        let target_transform = Mat4.identity()
        target_transform = target_transform
            .times(Mat4.translation(15.5,2,-17.5))
            .times(Mat4.rotation(-5,-4,-.3,0))
            .times(Mat4.translation(1.5,0,-1.02))
            .times(Mat4.translation(6,4,.36))
            .times(Mat4.translation(-5,-5,0))
            .times(Mat4.scale(0.5,0.5,0.5))
        this.shapes.regular_2D_polygon.draw(context, program_state, target_transform, this.materials.hole)

        // CAM STUFF
        this.bag = pos;
        this.bagCam = Mat4.inverse(beanbag_transform.times(Mat4.translation(0, 0, 5)));
        if (this.attached != undefined) {
            program_state.camera_inverse = this.attached().map((x,i) => Vector.from(program_state.camera_inverse[i]).mix(x, 0.1));
        }

    }
}
