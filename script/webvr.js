/* webvr api wrapper
 * TODO: 2.4 made
 */

/* WEV class ------------------------------------------------------------------ */
class WEV {
    /* @constructor
     * @param {function} [callbackFunction] - optional (or set to init method)
     */
    contructor(callbackFunction){
        this.ready        = false;
        this.vrMode       = false;
        this.display      = null;
        this.capabirities = null;
        this.layers       = null;
        this.activeLayer  = null;
        this.isConnected  = false;
        this.isPresenting = false;
        this.requestAnimationFrame = window.requestAnimationFrame;

        this.callback = null;
        if(callbackFunction){
            this.callback = callbackFunction;
            this.init();
        }

        /* MEMO
         * VRDisplayCapabirities
         *  {bool} hasPosition
         *  {bool} hasOrientation
         *  {bool} hasExternalDisplay
         *  {bool} canPresent
         *  {long} maxLayers
         */
    }
    /* initialize WEV
     * @param {function} callbackFunction - callback funciton
     */
    init(callbackFunction){
        if(callbackFunction){this.callback = callbackFunction;}
        if(navigator.getVRDisplays){
            // get vr display
            navigator.getVRDisplays().then((display)=>{
                let i, j;
                for(i = 0, j = display.length; i < j; ++i){
                    if(display[i] instanceof VRDisplay){
                        this.display = display[i];
                        this.capabirities = this.display.capabirities;
                        this.isConnected = this.display.isConnected;
                        this.isPresenting = this.display.isPresenting;
                        this.layers = this.display.getLayers();
                        this.requestAnimationFrame = this.display.requestAnimationFrame;
                        console.log('◆ vr find display: ' + i);
                        console.log(display[i]);
                        if(this.layers != null && this.layers.hasOwnProperty('length') && this.layers.length > 0){
                            this.activeLayer = this.layers[0];
                        }else{
                            console.warn('◆ not find layer');
                        }
                        break;
                    }
                }
                this.ready = true;
                if(this.callback){callbackFunction(display[i]);}
            }).catch(()=>{
                this.ready = false;
                console.log('◆ native error (getVRDisplays called)');
                if(this.callback){callbackFunction(null);}
            });
        }else{
            this.ready = false;
            console.log('◆ vr display not found');
            if(this.callback){callbackFunction(null);}
        }
    }

    /* reset pose
     */
    reset(){
        if(!this.display){return;}
        this.display.resetPose();
    }

    /* present to display
     * @param {VRLayer} layer - source layer
     * @return {Promise} - promise object or null
     */
    requestPresent(layer){
        if(!this.display){return null;}
        let sourceLayer = this.activeLayer;
        if(layer){sourceLayer = layer;}
        if(sourceLayer != null){
            return this.display.requestPresent(sourceLayer);
        }
    }

    /* exit presentation
     * @return {Promise} - promise object or null
     */
    exitPresent(){
        if(!this.display){return null;}
        return this.display.exitPresent();
    }

    /* submit from canvas to display
     * @param {VRPose} [pose] - optional
     */
    submitFrame(pose){
        if(!this.display){return;}
        this.display.submitFrame(pose);
    }

    /* request animation frame wrapper
     * @param {function} callback - callback function
     * @return {number<long>} - request handle
     */
    requestAnimationFrame(callback){
        return this.requestAnimationFrame(callback);
    }

    /* cancel of animation frame
     * @param {number<long>} handle - return value from requestAnimationFrame
     */
    cancelAnimationFrame(handle){
        this.display.cancelAnimationFrame(handle);
    }

    /* getters ---------------------------------------------------------------- */
    getDisplays(){
        if(!this.display){return null;}
        return this.display;
    }
    getDisplayId(){
        if(!this.display){return null;}
        return this.display.displayId;
    }
    getDisplayName(){
        if(!this.display){return null;}
        return this.display.displayName;
    }
    getLayers(){
        if(!this.display){return null;}
        return this.display.getLayers();
    }
    getCapabirities(){
        if(!this.display){return null;}
        return this.display.capabirities;
    }
    getStageParameters(){
        if(!this.display){return null;}
        return this.display.VRStageParameters;
    }
    getEyeParameters(){
        if(!this.display){return null;}
        return this.display.VREyeParameters;
    }
    getPose(){
        if(!this.display){return null;}
        return this.display.getPose();
    }
    getImmediatePose(){
        if(!this.display){return null;}
        return this.display.getImmediatePose();
    }
    getDepthNear(){
        if(!this.display){return null;}
        return this.display.depthNear;
    }
    getDepthFar(){
        if(!this.display){return null;}
        return this.display.depthFar;
    }
    /* return default bounds setting
     * @return {object} left bounds and right bounds
     */
    getDefaultBounds(){
        return {
            left:  [0.0, 0.0, 0.5, 1.0],
            right: [0.5, 0.0, 0.5, 1.0]
        };
    }
    /* get layer bounds (all value range of 0.0 to 1.0)
     * @param {number} [index] - index number
     * @return {object} left bounds and right bounds
     */
    getBounds(index){
        if(!this.display){return null;}
        let sourceLayer = this.activeLayer;
        if(index != null && this.layers[index] != null && index < this.capabirities.maxLayers){
            sourceLayer = this.layers[index];
        }
        return {
            left: sourceLayer.leftBounds,
            right: sourceLayer.rightBounds
        };
    }
}


// hmd ========================================================================
function HMD(){
    var tmp = this;
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
        }else{
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
    };
    this.reset = function(){
        if(this.sensor != null){
            if('resetSensor' in this.sensor){
                this.sensor.resetSensor();
            }else if('zeroSensor' in this.sensor){
                this.sensor.zeroSensor();
            }
        }
    };
}

