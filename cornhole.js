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
        };

        // *** Materials
        this.materials = {
            plastic: new Material(new defs.Phong_Shader(),
                { ambient: .4, diffusivity: .6, color: hex_color("#ffffff") }),
        };

        this.starttime = 0.0;
        this.currenttime = 0.0;
    }

    make_control_panel() {
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
    }
}
