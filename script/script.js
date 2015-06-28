// ============================================================================
// # TODO
// * クォータニオンの正規化関連
// * ポジトラのチェック
// 
// 
// ============================================================================

var vr;                    // vr wrap
var qvr = gl3.qtn.create();  // vr quaternion
var qt = gl3.qtn.create(); // mouse quaternion
gl3.qtn.identity(qt);
var run = true;
var info = null;

var PUSH_VR = true; // rendering target to hmd flags
var POSITION_SCALE = 1; // position tracking scale coefficient

window.onload = function(){
	vr = new HMD();
	vr.init(initialize);
};

// ============================================================================
function initialize(){
	if(!vr.hmd){
		console.log('device initialization failed');
		alert('device initialization failed');
		return;
	}
	
	// initialize
	gl3.initGL('canvas');
	if(!gl3.ready){console.log('initialize error'); return;}
	var gl = gl3.gl;

	// canvas size
	gl3.canvas.width  = window.innerWidth;
	gl3.canvas.height = window.innerHeight;

	// event
//	gl3.canvas.addEventListener('mousemove', mouseMove, false);
	window.addEventListener('keydown', keyDown, false);
	document.addEventListener("webkitfullscreenchange", onFullscreenChange, false);
	document.addEventListener("mozfullscreenchange", onFullscreenChange, false);
	
	// dom
	info = {
		infoX: document.getElementById('infoX'),
		infoY: document.getElementById('infoY'),
		infoZ: document.getElementById('infoZ'),
		infoW: document.getElementById('infoW')
	};

	// program
	var prg = gl3.program.create(
		'vs',
		'fs',
		['position', 'normal', 'color'],
		[3, 3, 4],
		['mMatrix', 'mvpMatrix', 'invMatrix', 'lightPosition', 'eyePosition', 'centerPoint', 'ambientColor'],
		['matrix4fv', 'matrix4fv', 'matrix4fv', '3fv', '3fv', '3fv', '4fv']
	);

	// torus mesh
	var torusData = gl3.mesh.torus(128, 128, 1.0, 3.0);
	var torusVBO = [
		gl3.create_vbo(torusData.position),
		gl3.create_vbo(torusData.normal),
		gl3.create_vbo(torusData.color)
	];
	var torusIBO = gl3.create_ibo(torusData.index);

	// sphere mesh
	var sphereData = gl3.mesh.sphere(32, 32, 0.25);
	var sphereVBO = [
		gl3.create_vbo(sphereData.position),
		gl3.create_vbo(sphereData.normal),
		gl3.create_vbo(sphereData.color)
	];
	var sphereIBO = gl3.create_ibo(sphereData.index);

	// matrix
	mMatrix = gl3.mat4.identity(gl3.mat4.create());
	vMatrix = gl3.mat4.identity(gl3.mat4.create());
	pMatrix = gl3.mat4.identity(gl3.mat4.create());
	vpMatrix = gl3.mat4.identity(gl3.mat4.create());
	mvpMatrix = gl3.mat4.identity(gl3.mat4.create());
	invMatrix = gl3.mat4.identity(gl3.mat4.create());
	qMatrix = gl3.mat4.identity(gl3.mat4.create());

	// depth test
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);
	gl.enable(gl.CULL_FACE);
	gl.clearDepth(1.0);

	// rendering
	var count = 0;
	var lightPosition = [0.0, 0.0, 0.0];
	
	// sensor reset
	vr.resizeFov(0.0);
	vr.reset();
	
	render();

	function render(){
		var _i, i, j;
		var gl = gl3.gl;
		count++;
		gl3.canvas.width  = window.innerWidth;
		gl3.canvas.height = window.innerHeight;
		
		// vr
		if(!vr.update()){
			console.log('hmd update failed!');
			return;
		}
		gl3.qtn.identity(qvr);
		gl3.qtn.rotate(
			(1.0 - vr.state.orientation.w) * gl3.PI,
			[
				vr.state.orientation.x,
				vr.state.orientation.y,
				vr.state.orientation.z
			],
			qvr
		);
		gl3.qtn.toMatIV(qvr, qMatrix);
		info.infoX.textContent = 'x: ' + vr.state.orientation.x;
		info.infoY.textContent = 'y: ' + vr.state.orientation.y;
		info.infoZ.textContent = 'z: ' + vr.state.orientation.z;
		info.infoW.textContent = 'w: ' + vr.state.orientation.w;

		gl3.scene_clear([0.3, 0.3, 0.3, 1.0], 1.0);

		cameraPosition = [0.0, 0.0, 10.0];
		centerPoint = [0.0, 0.0, 0.0];
		cameraUpDirection = [0.0, 1.0, 0.0];
		
		function renderMode(trans, view){
			var camera = gl3.camera.create(
				cameraPosition, centerPoint, cameraUpDirection,
				60, vr.aspect, 0.1, 100.0
			);
			gl3.scene_view(camera, view[0], view[1], view[2], view[3]);
			gl3.mat4.vpFromCamera(camera, vMatrix, pMatrix, vpMatrix);
	
			// torus rendering
			prg.set_program();
			prg.set_attribute(torusVBO, torusIBO);
			var radian = gl3.TRI.rad[count % 360];
			var axis = [0.0, 1.0, 0.0];
			gl3.mat4.identity(mMatrix);
			gl3.mat4.multiply(mMatrix, qMatrix, mMatrix);
			//gl3.mat4.rotate(mMatrix, radian, axis, mMatrix);
			gl3.mat4.multiply(vpMatrix, mMatrix, mvpMatrix);
			gl3.mat4.inverse(mMatrix, invMatrix);
			var ambientColor = [0.1, 0.1, 0.1, 0.0];
			prg.push_shader([mMatrix, mvpMatrix, invMatrix, lightPosition, cameraPosition, centerPoint, ambientColor]);
			gl3.draw_elements(gl.TRIANGLES, torusData.index.length);
	
			// sphere rendering
//			prg.set_program();
//			prg.set_attribute(sphereVBO, sphereIBO);
//			axis = [0.0, 1.0, 0.0];
//			for(i = 0; i < 3; i++){
//				for(j = 0; j < 8; j++){
//					var offset = [i + 1.0, 0.0, 0.0];
//					radian = gl3.TRI.rad[j * 45];
//					gl3.mat4.identity(mMatrix);
//					gl3.mat4.multiply(mMatrix, qMatrix, mMatrix);
//					gl3.mat4.rotate(mMatrix, radian, axis, mMatrix);
//					gl3.mat4.translate(mMatrix, offset, mMatrix);
//					gl3.mat4.multiply(vpMatrix, mMatrix, mvpMatrix);
//					gl3.mat4.inverse(mMatrix, invMatrix);
//					prg.push_shader([mMatrix, mvpMatrix, invMatrix, lightPosition, cameraPosition, centerPoint, ambientColor]);
//					gl3.draw_elements(gl.TRIANGLES, sphereData.index.length);
//				}
//			}
		}
		if(vr.vrMode){
			renderMode(
				[
					vr.eyeTranslation.left.x,
					vr.eyeTranslation.left.y,
					vr.eyeTranslation.left.z
				],
				[
					vr.eyeViewport.left.left,
					vr.eyeViewport.left.top,
					vr.eyeViewport.left.width,
					vr.eyeViewport.left.height
				]
			);
			renderMode(
				[
					vr.eyeTranslation.right.x,
					vr.eyeTranslation.right.y,
					vr.eyeTranslation.right.z
				],
				[
					vr.eyeViewport.right.left,
					vr.eyeViewport.right.top,
					vr.eyeViewport.right.width,
					vr.eyeViewport.right.height
				]
			);
		}else{
			renderMode(
				[0.0, 0.0, 0.0],
				[0, 0, gl3.canvas.width, gl3.canvas.height]
			);
		}
		if(run){requestAnimationFrame(render);}
	}
}

// event ======================================================================
//function mouseMove(eve){
//	var cw = gl3.canvas.width;
//	var ch = gl3.canvas.height;
//	var wh = 1 / Math.sqrt(cw * cw + ch * ch);
//	var x = eve.clientX - gl3.canvas.offsetLeft - cw * 0.5;
//	var y = eve.clientY - gl3.canvas.offsetTop - ch * 0.5;
//	var sq = Math.sqrt(x * x + y * y);
//	var r = sq * 2.0 * Math.PI * wh;
//	if (sq != 1) {
//		sq = 1 / sq;
//		x *= sq;
//		y *= sq;
//	}
//	gl3.qtn.rotate(r, [y, x, 0.0], qt);
//}

function keyDown(eve){
	if(eve.keyCode === 13){
		vr.vrMode = true;
		vr.resize();
		var flg = {}
		if(PUSH_VR){flg.vrDisplay = vr.hmd;}
		if(gl3.canvas.webkitRequestFullscreen){
			gl3.canvas.webkitRequestFullscreen(flg);
		}else if(gl3.canvas.mozRequestFullScreen){
			gl3.canvas.mozRequestFullScreen(flg);
		}
	}else if(eve.keyCode === 27){
		run = false;
	}
}

function onFullscreenChange() {
	if(!document.webkitFullscreenElement && !document.mozFullScreenElement){vr.vrMode = false;}
	vr.resize();
	vr.reset();
}

// hmd ========================================================================
function HMD(){
	this.ready    = false;
	this.vrMode   = false;
	this.sensor   = null;
	this.hmd      = null;
	this.state    = null;
	this.aspect   = 1.0;
	this.fovScale = 1.0;
	this.viewport = {width: 1920, height: 1080};
	this.fov            = {left: null, right: null};
	this.eyeTranslation = {left: null, right: null};
	this.eyeViewport    = {left: null, right: null};
	var tmp = this;
	this.init = function(callbackFunction){
		if(navigator.getVRDevices){
			navigator.getVRDevices().then(callback, callbackFunction);
		}else{
			console.log('device not found');
			alert('device not found');
			return;
		}
		function callback(device){
			for(var i = 0; i < device.length; i++){
				if(device[i] instanceof HMDVRDevice){
					tmp.hmd = device[i];
					tmp.eyeTranslation.left  = tmp.hmd.getEyeTranslation('left');
					tmp.eyeTranslation.right = tmp.hmd.getEyeTranslation('right');
					break;
				}
			}
			for(i = 0; i < device.length; i++){
				if(device[i] instanceof PositionSensorVRDevice &&
				  (!tmp.hmd || device[i].hardwareUnitId == tmp.hmd.hardwareUnitId)){
					tmp.sensor = device[i];
					if('resetSensor' in tmp.sensor){
						tmp.sensor.resetSensor();
					}else if('zeroSensor' in tmp.sensor){
						tmp.sensor.zeroSensor();
					}
					console.log(tmp.sensor.hardwareUnitId);
					console.log(tmp.sensor.deviceId);
					console.log(tmp.sensor.deviceName);
					break;
				}
			}
			tmp.ready = true;
			callbackFunction();
		}
	};
	this.update = function(){
		if(!this.sensor){return false;}
		this.state = this.sensor.getState();
		// this.state.timeStamp.toFixed(2);
		// this.state.orientation;
		// this.state.position;
		// this.state.angularVelocity;
		// this.state.linearVelocity;
		// this.state.angularAcceleration;
		// this.state.linearAcceleration;
		return true;
	};
	this.resize = function(){
		if(this.vrMode){
			this.aspect = this.viewport.width / this.viewport.height;
		} else {
			this.aspect = window.innerWidth / window.innerHeight;
		}
	};
	this.resizeFov = function(amount){
		var fovLeft, fovRight, a;
		if(!this.hmd){return;}
		if(amount == null){a = 0.0;}else{a = amount;}
		if(a != 0 && 'setFieldOfView' in this.hmd){
			this.fovScale += a;
			if(this.fovScale < 0.1){this.fovScale = 0.1;}
			fovLeft = this.hmd.getRecommendedEyeFieldOfView("left");
			fovRight = this.hmd.getRecommendedEyeFieldOfView("right");
			fovLeft.upDegrees *= this.fovScale;
			fovLeft.downDegrees *= this.fovScale;
			fovLeft.leftDegrees *= this.fovScale;
			fovLeft.rightDegrees *= this.fovScale;
			fovRight.upDegrees *= this.fovScale;
			fovRight.downDegrees *= this.fovScale;
			fovRight.leftDegrees *= this.fovScale;
			fovRight.rightDegrees *= this.fovScale;
			this.hmd.setFieldOfView(fovLeft, fovRight);
		}
		if('getRecommendedEyeRenderRect' in this.hmd){
			this.eyeViewport.left  = this.hmd.getRecommendedEyeRenderRect("left");
			this.eyeViewport.right = this.hmd.getRecommendedEyeRenderRect("right");
			this.viewport.width  = this.eyeViewport.left.width + this.eyeViewport.right.width;
			this.viewport.height = Math.max(this.eyeViewport.left.height, this.eyeViewport.right.height);
		}
		this.resize();
		if('getCurrentEyeFieldOfView' in this.hmd){
			this.fov.left  = this.hmd.getCurrentEyeFieldOfView("left");
			this.fov.right = this.hmd.getCurrentEyeFieldOfView("right");
		}else{
			this.fov.left  = this.hmd.getRecommendedEyeFieldOfView("left");
			this.fov.right = this.hmd.getRecommendedEyeFieldOfView("right");
		}
	}
	this.reset = function(){
		if(this.sensor != null){
			if('resetSensor' in this.sensor){
				this.sensor.resetSensor();
			}else if('zeroSensor' in this.sensor){
				this.sensor.zeroSensor();
			}
		}
	}
}

