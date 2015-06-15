var qt = gl3.qtn.create();
gl3.qtn.identity(qt);

window.onload = function(){
	// initialize
	gl3.initGL('canvas');
	if(!gl3.ready){console.log('initialize error'); return;}

	// canvas size
	var canvasSize = Math.min(window.innerWidth, window.innerHeight);
	gl3.canvas.width  = canvasSize;
	gl3.canvas.height = canvasSize;

	// event
	gl3.canvas.addEventListener('mousemove', mouseMove, true);










var sensorDevice = null;
var hmdDevice = null;
var vrMode = false;
var renderTargetWidth = 1920;
var renderTargetHeight = 1080;

function PerspectiveMatrixFromVRFieldOfView(fov, zNear, zFar) {
	var outMat = new THREE.Matrix4();
	var out = outMat.elements;
	var upTan, downTan, leftTan, rightTan;
	if (fov == null) {
		// If no FOV is given plug in some dummy values
		upTan = Math.tan(50 * Math.PI/180.0);
		downTan = Math.tan(50 * Math.PI/180.0);
		leftTan = Math.tan(45 * Math.PI/180.0);
		rightTan = Math.tan(45 * Math.PI/180.0);
	} else {
		upTan = Math.tan(fov.upDegrees * Math.PI/180.0);
		downTan = Math.tan(fov.downDegrees * Math.PI/180.0);
		leftTan = Math.tan(fov.leftDegrees * Math.PI/180.0);
		rightTan = Math.tan(fov.rightDegrees * Math.PI/180.0);
	}

	var xScale = 2.0 / (leftTan + rightTan);
	var yScale = 2.0 / (upTan + downTan);

	out[0] = xScale;
	out[4] = 0.0;
	out[8] = -((leftTan - rightTan) * xScale * 0.5);
	out[12] = 0.0;

	out[1] = 0.0;
	out[5] = yScale;
	out[9] = ((upTan - downTan) * yScale * 0.5);
	out[13] = 0.0;

	out[2] = 0.0;
	out[6] = 0.0;
	out[10] = zFar / (zNear - zFar);
	out[14] = (zFar * zNear) / (zNear - zFar);

	out[3] = 0.0;
	out[7] = 0.0;
	out[11] = -1.0;
	out[15] = 0.0;

	return outMat;
}

var cameraLeft = new THREE.PerspectiveCamera( 75, 4/3, 0.1, 1000 );
var cameraRight = new THREE.PerspectiveCamera( 75, 4/3, 0.1, 1000 );

var fovScale = 1.0;
function resizeFOV(amount) {
	var fovLeft, fovRight;

	if (!hmdDevice) { return; }

	if (amount != 0 && 'setFieldOfView' in hmdDevice) {
		fovScale += amount;
		if (fovScale < 0.1) { fovScale = 0.1; }

		fovLeft = hmdDevice.getRecommendedEyeFieldOfView("left");
		fovRight = hmdDevice.getRecommendedEyeFieldOfView("right");

		fovLeft.upDegrees *= fovScale;
		fovLeft.downDegrees *= fovScale;
		fovLeft.leftDegrees *= fovScale;
		fovLeft.rightDegrees *= fovScale;

		fovRight.upDegrees *= fovScale;
		fovRight.downDegrees *= fovScale;
		fovRight.leftDegrees *= fovScale;
		fovRight.rightDegrees *= fovScale;

		hmdDevice.setFieldOfView(fovLeft, fovRight);
	}

	if ('getRecommendedEyeRenderRect' in hmdDevice) {
		var leftEyeViewport = hmdDevice.getRecommendedEyeRenderRect("left");
		var rightEyeViewport = hmdDevice.getRecommendedEyeRenderRect("right");
		renderTargetWidth = leftEyeViewport.width + rightEyeViewport.width;
		renderTargetHeight = Math.max(leftEyeViewport.height, rightEyeViewport.height);
		document.getElementById("renderTarget").innerHTML = renderTargetWidth + "x" + renderTargetHeight;
	}

	resize();

	if ('getCurrentEyeFieldOfView' in hmdDevice) {
		fovLeft = hmdDevice.getCurrentEyeFieldOfView("left");
		fovRight = hmdDevice.getCurrentEyeFieldOfView("right");
	} else {
		fovLeft = hmdDevice.getRecommendedEyeFieldOfView("left");
		fovRight = hmdDevice.getRecommendedEyeFieldOfView("right");
	}

	cameraLeft.projectionMatrix = PerspectiveMatrixFromVRFieldOfView(fovLeft, 0.1, 1000);
	cameraRight.projectionMatrix = PerspectiveMatrixFromVRFieldOfView(fovRight, 0.1, 1000);
}

function resetSensor() {
	if (sensorDevice) {
		if ('resetSensor' in sensorDevice) {
			sensorDevice.resetSensor();
		} else if ('zeroSensor' in sensorDevice) {
			sensorDevice.zeroSensor();
		}
	}
}

function EnumerateVRDevices(devices) {
	// First find an HMD device
	for (var i = 0; i < devices.length; ++i) {
		if (devices[i] instanceof HMDVRDevice) {
			hmdDevice = devices[i];

			var eyeOffsetLeft = hmdDevice.getEyeTranslation("left");
			var eyeOffsetRight = hmdDevice.getEyeTranslation("right")
				document.getElementById("leftTranslation").innerHTML = printVector(eyeOffsetLeft);
			document.getElementById("rightTranslation").innerHTML = printVector(eyeOffsetRight);

			cameraLeft.position.add(eyeOffsetLeft);
			cameraLeft.position.z = 12;

			cameraRight.position.add(eyeOffsetRight);
			cameraRight.position.z = 12;

			resizeFOV(0.0);
		}
	}

	// Next find a sensor that matches the HMD hardwareUnitId
	for (var i = 0; i < devices.length; ++i) {
		if (devices[i] instanceof PositionSensorVRDevice &&
				(!hmdDevice || devices[i].hardwareUnitId == hmdDevice.hardwareUnitId)) {
			sensorDevice = devices[i];
			document.getElementById("hardwareUnitId").innerHTML = sensorDevice.hardwareUnitId;
			document.getElementById("deviceId").innerHTML = sensorDevice.deviceId;
			document.getElementById("deviceName").innerHTML = sensorDevice.deviceName;
			resetSensor();
		}
	}
}

if (navigator.getVRDevices) {
	navigator.getVRDevices().then(EnumerateVRDevices);
} else if (navigator.mozGetVRDevices) {
	navigator.mozGetVRDevices(EnumerateVRDevices);
} else {
	stats.classList.add("error");
	stats.innerHTML = "WebVR API not supported";
}

window.addEventListener("keydown", function(ev) {
	if (hmdDevice) {
		if (ev.keyCode == "R".charCodeAt(0))  {
			resetSensor();
		}
		if (ev.keyCode == 187 || ev.keyCode == 61)  { // "+" key
			resizeFOV(0.1);
		}
		if (ev.keyCode == 189 || ev.keyCode == 173)  { // "-" key
			resizeFOV(-0.1);
		}
	}
});

//
// Rendering
//
var renderer = new THREE.WebGLRenderer();
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

renderer.setClearColor(0x202020, 1.0);

var ambient = new THREE.AmbientLight( 0x444444 );
scene.add( ambient );

var directionalLight = new THREE.DirectionalLight( 0xffeedd );
directionalLight.position.set( 0, 0, 1 ).normalize();
scene.add( directionalLight );

var riftObj = new THREE.Object3D();
scene.add(riftObj);

var rift = null;

camera.position.z = 12;

function resize() {
	if (vrMode) {
		camera.aspect = renderTargetWidth / renderTargetHeight;
		camera.updateProjectionMatrix();
		renderer.setSize( renderTargetWidth, renderTargetHeight );
	} else {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		renderer.setSize( window.innerWidth, window.innerHeight );
	}
}
resize();
window.addEventListener("resize", resize, false);

renderer.domElement.addEventListener("touchstart", function(ev) {
	resetSensor();
});

// Fullscreen VR mode handling

function onFullscreenChange() {
	if(!document.webkitFullscreenElement && !document.mozFullScreenElement) {
		vrMode = false;
	}
	resize();
}

document.addEventListener("webkitfullscreenchange", onFullscreenChange, false);
document.addEventListener("mozfullscreenchange", onFullscreenChange, false);

var vrBtn = document.getElementById("vrBtn");
if (vrBtn) {
	vrBtn.addEventListener("click", function() {
		vrMode = true;
		resize();
		if (renderer.domElement.webkitRequestFullscreen) {
			renderer.domElement.webkitRequestFullscreen({ vrDisplay: hmdDevice });
		} else if (renderer.domElement.mozRequestFullScreen) {
			renderer.domElement.mozRequestFullScreen({ vrDisplay: hmdDevice });
		}
	}, false);
}

//
// Update Loop
//

var timestamp = document.getElementById("timestamp");
var orientation = document.getElementById("orientation");
var position = document.getElementById("position");
var angularVelocity = document.getElementById("angularVelocity");
var linearVelocity = document.getElementById("linearVelocity");
var angularAcceleration = document.getElementById("angularAcceleration");
var linearAcceleration = document.getElementById("linearAcceleration");

function updateVRDevice() {
	if (!sensorDevice) return false;
	var vrState = sensorDevice.getState();

	timestamp.innerHTML = vrState.timeStamp.toFixed(2);
	orientation.innerHTML = printVector(vrState.orientation);
	position.innerHTML = printVector(vrState.position);
	angularVelocity.innerHTML = printVector(vrState.angularVelocity);
	linearVelocity.innerHTML = printVector(vrState.linearVelocity);
	angularAcceleration.innerHTML = printVector(vrState.angularAcceleration);
	linearAcceleration.innerHTML = printVector(vrState.linearAcceleration);

	if (riftObj) {
		if (vrState.position) {
			riftObj.position.x = vrState.position.x * VR_POSITION_SCALE;
			riftObj.position.y = vrState.position.y * VR_POSITION_SCALE;
			riftObj.position.z = vrState.position.z * VR_POSITION_SCALE;
		}

		if (vrState.orientation) {
			riftObj.quaternion.x = vrState.orientation.x;
			riftObj.quaternion.y = vrState.orientation.y;
			riftObj.quaternion.z = vrState.orientation.z;
			riftObj.quaternion.w = vrState.orientation.w;
		}
	}

	return true;
}

function render(t) {
	requestAnimationFrame(render);

	if (!updateVRDevice() && rift) {
		// If we don't have a VR device just spin the model around to give us
		// something pretty to look at.
		rift.rotation.y += 0.01;
	}

	if (vrMode) {
		// Render left eye
		renderer.enableScissorTest ( true );
		renderer.setScissor( 0, 0, renderTargetWidth / 2, renderTargetHeight );
		renderer.setViewport( 0, 0, renderTargetWidth / 2, renderTargetHeight );
		renderer.render(scene, cameraLeft);

		// Render right eye
		renderer.setScissor( renderTargetWidth / 2, 0, renderTargetWidth / 2, renderTargetHeight );
		renderer.setViewport( renderTargetWidth / 2, 0, renderTargetWidth / 2, renderTargetHeight );
		renderer.render(scene, cameraRight);
	} else {
		// Render mono view
		renderer.enableScissorTest ( false );
		renderer.setViewport( 0, 0, window.innerWidth, window.innerHeight );
		renderer.render(scene, camera);
	}
}
document.body.appendChild( renderer.domElement );
render();






















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
	var torusData = gl3.mesh.torus(64, 64, 0.2, 0.5);
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

	// depth test
	gl3.gl.enable(gl3.gl.DEPTH_TEST);
	gl3.gl.depthFunc(gl3.gl.LEQUAL);
	gl3.gl.clearDepth(1.0);

	// rendering
	var count = 0;
	render();

	function render(){
		var i, j;
		count++;

		var sin = gl3.TRI.sin[count % 360] * 4.0;
		var lightPosition = [0.0, sin, 0.0];
		var cameraPosition = [];
		var centerPoint = [0.0, 0.0, 0.0];
		var cameraUpDirection = [];
		gl3.qtn.toVecIII([0.0, 0.0, 10.0], qt, cameraPosition);
		gl3.qtn.toVecIII([0.0, 1.0, 0.0], qt, cameraUpDirection);
		var camera = gl3.camera.create(
			cameraPosition,
			centerPoint,
			cameraUpDirection,
			45, 1.0, 0.1, 20.0
		);
		gl3.scene_clear([0.3, 0.3, 0.3, 1.0], 1.0);
		gl3.scene_view(camera, 0, 0, gl3.canvas.width, gl3.canvas.height);
		gl3.mat4.vpFromCamera(camera, vMatrix, pMatrix, vpMatrix);

		// torus rendering
		prg.set_program();
		prg.set_attribute(torusVBO, torusIBO);
		var radian = gl3.TRI.rad[count % 360];
		var axis = [0.0, 1.0, 0.0];
		gl3.mat4.identity(mMatrix);
		gl3.mat4.rotate(mMatrix, radian, axis, mMatrix);
		gl3.mat4.multiply(vpMatrix, mMatrix, mvpMatrix);
		gl3.mat4.inverse(mMatrix, invMatrix);
		var ambientColor = [0.1, 0.1, 0.1, 0.0];
		prg.push_shader([mMatrix, mvpMatrix, invMatrix, lightPosition, cameraPosition, centerPoint, ambientColor]);
		gl3.draw_elements(gl3.gl.TRIANGLES, torusData.index.length);

		// sphere rendering
		prg.set_program();
		prg.set_attribute(sphereVBO, sphereIBO);
		axis = [0.0, 1.0, 0.0];
		for(i = 0; i < 3; i++){
			for(j = 0; j < 8; j++){
				var offset = [i + 1.0, 0.0, 0.0];
				radian = gl3.TRI.rad[j * 45];
				gl3.mat4.identity(mMatrix);
				gl3.mat4.rotate(mMatrix, radian, axis, mMatrix);
				gl3.mat4.translate(mMatrix, offset, mMatrix);
				gl3.mat4.multiply(vpMatrix, mMatrix, mvpMatrix);
				gl3.mat4.inverse(mMatrix, invMatrix);
				prg.push_shader([mMatrix, mvpMatrix, invMatrix, lightPosition, cameraPosition, centerPoint, ambientColor]);
				gl3.draw_elements(gl3.gl.TRIANGLES, sphereData.index.length);
			}
		}

		requestAnimationFrame(render);
	}
};

function mouseMove(eve) {
	var cw = gl3.canvas.width;
	var ch = gl3.canvas.height;
	var wh = 1 / Math.sqrt(cw * cw + ch * ch);
	var x = eve.clientX - gl3.canvas.offsetLeft - cw * 0.5;
	var y = eve.clientY - gl3.canvas.offsetTop - ch * 0.5;
	var sq = Math.sqrt(x * x + y * y);
	var r = sq * 2.0 * Math.PI * wh;
	if (sq != 1) {
		sq = 1 / sq;
		x *= sq;
		y *= sq;
	}
	gl3.qtn.rotate(r, [y, x, 0.0], qt);
}



// ============================================================================================================================================================

//
// WebVR Device initialization
//
//var sensorDevice = null;
//var hmdDevice = null;
//var vrMode = false;
//var renderTargetWidth = 1920;
//var renderTargetHeight = 1080;
//
//function PerspectiveMatrixFromVRFieldOfView(fov, zNear, zFar) {
//	var outMat = new THREE.Matrix4();
//	var out = outMat.elements;
//	var upTan, downTan, leftTan, rightTan;
//	if (fov == null) {
//		// If no FOV is given plug in some dummy values
//		upTan = Math.tan(50 * Math.PI/180.0);
//		downTan = Math.tan(50 * Math.PI/180.0);
//		leftTan = Math.tan(45 * Math.PI/180.0);
//		rightTan = Math.tan(45 * Math.PI/180.0);
//	} else {
//		upTan = Math.tan(fov.upDegrees * Math.PI/180.0);
//		downTan = Math.tan(fov.downDegrees * Math.PI/180.0);
//		leftTan = Math.tan(fov.leftDegrees * Math.PI/180.0);
//		rightTan = Math.tan(fov.rightDegrees * Math.PI/180.0);
//	}
//
//	var xScale = 2.0 / (leftTan + rightTan);
//	var yScale = 2.0 / (upTan + downTan);
//
//	out[0] = xScale;
//	out[4] = 0.0;
//	out[8] = -((leftTan - rightTan) * xScale * 0.5);
//	out[12] = 0.0;
//
//	out[1] = 0.0;
//	out[5] = yScale;
//	out[9] = ((upTan - downTan) * yScale * 0.5);
//	out[13] = 0.0;
//
//	out[2] = 0.0;
//	out[6] = 0.0;
//	out[10] = zFar / (zNear - zFar);
//	out[14] = (zFar * zNear) / (zNear - zFar);
//
//	out[3] = 0.0;
//	out[7] = 0.0;
//	out[11] = -1.0;
//	out[15] = 0.0;
//
//	return outMat;
//}
//
//var cameraLeft = new THREE.PerspectiveCamera( 75, 4/3, 0.1, 1000 );
//var cameraRight = new THREE.PerspectiveCamera( 75, 4/3, 0.1, 1000 );
//
//var fovScale = 1.0;
//function resizeFOV(amount) {
//	var fovLeft, fovRight;
//
//	if (!hmdDevice) { return; }
//
//	if (amount != 0 && 'setFieldOfView' in hmdDevice) {
//		fovScale += amount;
//		if (fovScale < 0.1) { fovScale = 0.1; }
//
//		fovLeft = hmdDevice.getRecommendedEyeFieldOfView("left");
//		fovRight = hmdDevice.getRecommendedEyeFieldOfView("right");
//
//		fovLeft.upDegrees *= fovScale;
//		fovLeft.downDegrees *= fovScale;
//		fovLeft.leftDegrees *= fovScale;
//		fovLeft.rightDegrees *= fovScale;
//
//		fovRight.upDegrees *= fovScale;
//		fovRight.downDegrees *= fovScale;
//		fovRight.leftDegrees *= fovScale;
//		fovRight.rightDegrees *= fovScale;
//
//		hmdDevice.setFieldOfView(fovLeft, fovRight);
//	}
//
//	if ('getRecommendedEyeRenderRect' in hmdDevice) {
//		var leftEyeViewport = hmdDevice.getRecommendedEyeRenderRect("left");
//		var rightEyeViewport = hmdDevice.getRecommendedEyeRenderRect("right");
//		renderTargetWidth = leftEyeViewport.width + rightEyeViewport.width;
//		renderTargetHeight = Math.max(leftEyeViewport.height, rightEyeViewport.height);
//		document.getElementById("renderTarget").innerHTML = renderTargetWidth + "x" + renderTargetHeight;
//	}
//
//	resize();
//
//	if ('getCurrentEyeFieldOfView' in hmdDevice) {
//		fovLeft = hmdDevice.getCurrentEyeFieldOfView("left");
//		fovRight = hmdDevice.getCurrentEyeFieldOfView("right");
//	} else {
//		fovLeft = hmdDevice.getRecommendedEyeFieldOfView("left");
//		fovRight = hmdDevice.getRecommendedEyeFieldOfView("right");
//	}
//
//	cameraLeft.projectionMatrix = PerspectiveMatrixFromVRFieldOfView(fovLeft, 0.1, 1000);
//	cameraRight.projectionMatrix = PerspectiveMatrixFromVRFieldOfView(fovRight, 0.1, 1000);
//}
//
//function resetSensor() {
//	if (sensorDevice) {
//		if ('resetSensor' in sensorDevice) {
//			sensorDevice.resetSensor();
//		} else if ('zeroSensor' in sensorDevice) {
//			sensorDevice.zeroSensor();
//		}
//	}
//}
//
//function EnumerateVRDevices(devices) {
//	// First find an HMD device
//	for (var i = 0; i < devices.length; ++i) {
//		if (devices[i] instanceof HMDVRDevice) {
//			hmdDevice = devices[i];
//
//			var eyeOffsetLeft = hmdDevice.getEyeTranslation("left");
//			var eyeOffsetRight = hmdDevice.getEyeTranslation("right")
//				document.getElementById("leftTranslation").innerHTML = printVector(eyeOffsetLeft);
//			document.getElementById("rightTranslation").innerHTML = printVector(eyeOffsetRight);
//
//			cameraLeft.position.add(eyeOffsetLeft);
//			cameraLeft.position.z = 12;
//
//			cameraRight.position.add(eyeOffsetRight);
//			cameraRight.position.z = 12;
//
//			resizeFOV(0.0);
//		}
//	}
//
//	// Next find a sensor that matches the HMD hardwareUnitId
//	for (var i = 0; i < devices.length; ++i) {
//		if (devices[i] instanceof PositionSensorVRDevice &&
//				(!hmdDevice || devices[i].hardwareUnitId == hmdDevice.hardwareUnitId)) {
//			sensorDevice = devices[i];
//			document.getElementById("hardwareUnitId").innerHTML = sensorDevice.hardwareUnitId;
//			document.getElementById("deviceId").innerHTML = sensorDevice.deviceId;
//			document.getElementById("deviceName").innerHTML = sensorDevice.deviceName;
//			resetSensor();
//		}
//	}
//}
//
//if (navigator.getVRDevices) {
//	navigator.getVRDevices().then(EnumerateVRDevices);
//} else if (navigator.mozGetVRDevices) {
//	navigator.mozGetVRDevices(EnumerateVRDevices);
//} else {
//	stats.classList.add("error");
//	stats.innerHTML = "WebVR API not supported";
//}
//
//window.addEventListener("keydown", function(ev) {
//	if (hmdDevice) {
//		if (ev.keyCode == "R".charCodeAt(0))  {
//			resetSensor();
//		}
//		if (ev.keyCode == 187 || ev.keyCode == 61)  { // "+" key
//			resizeFOV(0.1);
//		}
//		if (ev.keyCode == 189 || ev.keyCode == 173)  { // "-" key
//			resizeFOV(-0.1);
//		}
//	}
//});
//
////
//// Rendering
////
//var renderer = new THREE.WebGLRenderer();
//var scene = new THREE.Scene();
//var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
//
//renderer.setClearColor(0x202020, 1.0);
//
//var ambient = new THREE.AmbientLight( 0x444444 );
//scene.add( ambient );
//
//var directionalLight = new THREE.DirectionalLight( 0xffeedd );
//directionalLight.position.set( 0, 0, 1 ).normalize();
//scene.add( directionalLight );
//
//var riftObj = new THREE.Object3D();
//scene.add(riftObj);
//
//var rift = null;
//
//camera.position.z = 12;
//
//function resize() {
//	if (vrMode) {
//		camera.aspect = renderTargetWidth / renderTargetHeight;
//		camera.updateProjectionMatrix();
//		renderer.setSize( renderTargetWidth, renderTargetHeight );
//	} else {
//		camera.aspect = window.innerWidth / window.innerHeight;
//		camera.updateProjectionMatrix();
//		renderer.setSize( window.innerWidth, window.innerHeight );
//	}
//}
//resize();
//window.addEventListener("resize", resize, false);
//
//renderer.domElement.addEventListener("touchstart", function(ev) {
//	resetSensor();
//});
//
//// Fullscreen VR mode handling
//
//function onFullscreenChange() {
//	if(!document.webkitFullscreenElement && !document.mozFullScreenElement) {
//		vrMode = false;
//	}
//	resize();
//}
//
//document.addEventListener("webkitfullscreenchange", onFullscreenChange, false);
//document.addEventListener("mozfullscreenchange", onFullscreenChange, false);
//
//var vrBtn = document.getElementById("vrBtn");
//if (vrBtn) {
//	vrBtn.addEventListener("click", function() {
//		vrMode = true;
//		resize();
//		if (renderer.domElement.webkitRequestFullscreen) {
//			renderer.domElement.webkitRequestFullscreen({ vrDisplay: hmdDevice });
//		} else if (renderer.domElement.mozRequestFullScreen) {
//			renderer.domElement.mozRequestFullScreen({ vrDisplay: hmdDevice });
//		}
//	}, false);
//}
//
////
//// Update Loop
////
//
//var timestamp = document.getElementById("timestamp");
//var orientation = document.getElementById("orientation");
//var position = document.getElementById("position");
//var angularVelocity = document.getElementById("angularVelocity");
//var linearVelocity = document.getElementById("linearVelocity");
//var angularAcceleration = document.getElementById("angularAcceleration");
//var linearAcceleration = document.getElementById("linearAcceleration");
//
//function updateVRDevice() {
//	if (!sensorDevice) return false;
//	var vrState = sensorDevice.getState();
//
//	timestamp.innerHTML = vrState.timeStamp.toFixed(2);
//	orientation.innerHTML = printVector(vrState.orientation);
//	position.innerHTML = printVector(vrState.position);
//	angularVelocity.innerHTML = printVector(vrState.angularVelocity);
//	linearVelocity.innerHTML = printVector(vrState.linearVelocity);
//	angularAcceleration.innerHTML = printVector(vrState.angularAcceleration);
//	linearAcceleration.innerHTML = printVector(vrState.linearAcceleration);
//
//	if (riftObj) {
//		if (vrState.position) {
//			riftObj.position.x = vrState.position.x * VR_POSITION_SCALE;
//			riftObj.position.y = vrState.position.y * VR_POSITION_SCALE;
//			riftObj.position.z = vrState.position.z * VR_POSITION_SCALE;
//		}
//
//		if (vrState.orientation) {
//			riftObj.quaternion.x = vrState.orientation.x;
//			riftObj.quaternion.y = vrState.orientation.y;
//			riftObj.quaternion.z = vrState.orientation.z;
//			riftObj.quaternion.w = vrState.orientation.w;
//		}
//	}
//
//	return true;
//}
//
//function render(t) {
//	requestAnimationFrame(render);
//
//	if (!updateVRDevice() && rift) {
//		// If we don't have a VR device just spin the model around to give us
//		// something pretty to look at.
//		rift.rotation.y += 0.01;
//	}
//
//	if (vrMode) {
//		// Render left eye
//		renderer.enableScissorTest ( true );
//		renderer.setScissor( 0, 0, renderTargetWidth / 2, renderTargetHeight );
//		renderer.setViewport( 0, 0, renderTargetWidth / 2, renderTargetHeight );
//		renderer.render(scene, cameraLeft);
//
//		// Render right eye
//		renderer.setScissor( renderTargetWidth / 2, 0, renderTargetWidth / 2, renderTargetHeight );
//		renderer.setViewport( renderTargetWidth / 2, 0, renderTargetWidth / 2, renderTargetHeight );
//		renderer.render(scene, cameraRight);
//	} else {
//		// Render mono view
//		renderer.enableScissorTest ( false );
//		renderer.setViewport( 0, 0, window.innerWidth, window.innerHeight );
//		renderer.render(scene, camera);
//	}
//}
//document.body.appendChild( renderer.domElement );
//render();
