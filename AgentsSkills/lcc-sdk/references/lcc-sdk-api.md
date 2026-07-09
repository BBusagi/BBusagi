## LCC Data Organization Format

## API Reference Summary
###
### GetRender()
The GetRender() method provided by the LCCManager component is the only entry point to obtain the LCC renderer. This method has two overloads, corresponding to two different usage methods:

1） Manually create a Gameobject

When using this mode, the user manually creates an LCCRenderer game object in the Hierarchy window, and then mounts a custom script on the game object, obtaining the renderer through the first reload using the GetRender() method.
``` Csharp
public Renderer GetRender
(
    Transform _transform              // LCCRenderer gameobject's transform
)
```
SDK Sample uses this method to obtain the renderer, which is suitable for statically creating LCCRenderer game objects in advance and mounting custom scripts on the game objects for use.

2） Automatically create Gameobject

When using this mode, the renderer is obtained through the second overloading of the GetRender() method, and an LCCRenderer game object will automatically create, which is generated in the scene root directory.
``` Csharp
Renderer GetRender(out GameObject gameObject)
```
This overload not only returns the renderer, but also a game object named LCCRenderer, which can be obtained through output parameters. This method is suitable for dynamically creating LCCRenderer game objects in advance and controlling the situation where scripts are mounted on another game object.

### Load()
The SDK only provides a Load() method, without an unLoad() method. To load multiple times, simply call this method repeatedly. Each subsequent call will destroy the previous scene's rendering data and load new data. The method prototype is as follows:
``` Csharp
    public void Load
(
    string _filePath,              // Data file path
    PlatformType _pType,           // Platform type
    Action _callBack               // Callback after loading is complete
)
```
LCCCore.PlatformType is an enumeration type, currently including: PlatformType {PC, Mac, Android, iOS, Pico, Quest, Pad}. 

The Unity SDK does not perform any translation, rotation, or scaling operations on the scene; it is the responsibility of the application to do this. When using XGRIDS devices (including Lixel L series, K series scanners)  and generated data via LCC Studio, the GameObject where the renderer is attached and the Camera need the following transformations. An example call to the Load() method is shown below:
``` Csharp
private void onLoadCallback()
{
    Debug.Log("data loaded !!!");
}
// The SDK does not handle the initial transform of the GameObject; please process it as follows:
// transform refers to the transform of the GameObject where LCCRenderer is attached
transform.rotation = Quaternion.identity;
transform.Rotate(Vector3.right, -90);
transform.localScale = new Vector3(-1, 1, 1);
// Default initial position of the camera
Camera.main.gameObject.transform.rotation = Quaternion.identity;
Camera.main.gameObject.transform.position = new Vector3(0.0f, 1.6f, 0.0f);
Camera.main.gameObject.transform.Rotate(Vector3.up, 180);
```

> Notes:  
> 1）Platform support affects the rendering strategy and the LOD loading scheme used, but you can also specify a platform for backward compatibility. For example, to run on older hardware platforms, select Android/iOS for a PC platform; for iPad Air compatibility, specify Pad.  
> 2）You need to specify the meta.lcc (or meta.splat) file.  
> 3）Use an absolute path, not a relative path.  
> 4）For different platforms (examples):  
    Windows (requires double "\"): G:\\GaussianSplat\\0315-art-center\\meta.lcc  
    Mac (uses single "/", with file:///): file:///users/data/lcc/meta.lcc  
    Server (uses single "/"): https://xgus1.blob.core.windows.net/lcc-pub/Tower/meta.lcc  
> 5）For *.ply format files, only local files are supported, not server files.

### Raycast()
Ray detection must be performed through the Raycast() method of an instance of LCCManager. This method provides two overloads (one with screen coordinates as input parameters, and another with the ray origin + ray direction as input parameters). The method returns a boolean result of the raycasting, with true indicating a collision and false indicating no collision detected. When the return value is true, the HitResult stores the results of the raycasting.
``` Csharp
public bool Raycast
(
    Ray _ray,                    // Unity's Ray instance object
    out HitResult _finalResult   // Collision detection result data
)

// Overload
public bool Raycast
(
    Vector3 mousePos,            // Position of the mouse click point on the screen, Z value can be set to 0
    out HitResult _finalResult   // Collision detection result data
)
```
The collision result object HitResult is defined as follows:
``` Csharp
   public struct HitResult
{
    public bool isHit;          // Whether a collision occurred
    public float distance;      // Distance between the collision point and the camera
    public Vector3 hitPos;      // Position of the collision point in world space
    public float dist2Origin;   // Distance of the collision point from the ray origin
}
```
When rendering multiple scenes, this method works for all rendered scenes.

It should be noted: The Raycast() method is relatively resource-intensive and time-consuming, and should be avoided being called in every frame.

### SwitchRenderMode()
The renderer provides the SwitchRenderMode() method for switching between point cloud display and 3DGS rendering display. This method accepts an enumeration type of LCCCore.RenderMode. If point cloud rendering is used, a point cloud elevation color map must be provided. If no color map is provided, it defaults to white. The prototype of this method is as follows:
``` Csharp
public void SwitchRenderMode
(
    RenderMode _mode,         // Rendering mode
    Texture2D _tex = null     // When using 3DGS rendering, an elevation color map can be provided
)
```
LCCCore.RenderMode is an enumeration type, defined as follows:

``` Csharp
public enum RenderMode 
{ 
    PointCloud,             // Point cloud rendering
    LCCGS                   // 3DGS rendering mode
};
```
The color map is mainly used for the elevation coloring of the point cloud. An example of a color map is as follows: 
(Note: The actual color map image or description should be provided here, which is not included in the original text.)

### SetEnable()
This method is used to set whether the scene is active for rendering. By default, rendering starts immediately after the scene is loaded with the Load() method. This method can be used to pause the rendering of the scene or to resume it. The prototype of this method is as follows:
``` Csharp
public void SetEnable
(
    bool _enable         // Whether to enable rendering, false to stop rendering, true for normal rendering
)
```
When rendering multiple scenes, you can use this method to set the rendering state of each scene, thus achieving the purpose of scene rendering management.

### SetShcoef()
At PC platform spherical harmonics rendering used by default. The SetShcoef() method sets whether the scene uses spherical harmonics rendering. Spherical harmonics affect the detail of the scene rendering; turning it off can provide better performance while maintaining normal rendering effects, and turning it on will offer more refined rendering. The prototype of this method is as follows:
``` Csharp
public void SetShcoef
(
    bool _shcoef       // Whether to enable spherical harmonics rendering
)
```
It should be noted that currently, this method must be called before the Load() method in order to take effect. Calling this method after the Load() method may result in errors.

### SetEnvironment()
At PC platform  environmental rendering by default. The SetEnvironment() method sets whether the scene uses environmental data (when environmental data is available). The prototype of this method is as follows:
``` Csharp
public void SetEnvironment
(
    bool _env         // Whether to use environmental data, true indicates on, false indicates off
)
```
> Notes: This method should  be called after the Load() method is invoked to take effect.

### SetRenderAll()
Full rendering means loading all data at the start without performing block division and streaming load operations. Full rendering provides better effects and smoother roaming, but when dealing with large amounts of data, full rendering requires more rendering resources (mainly GPU). On a computer with an RTX 3060 GPU, it can achieve a rendering speed of 20 million splats at 30 FPS. The SDK is configured by default to use full rendering for a total number of splat counts below 15 million, but whether to use full rendering is affected by two parameters: (1) whether full rendering is set; (2) whether the number of splats exceeds the configured value. These two parameters are in an "OR" relationship, meaning that as long as one of the parameters is met, full rendering will be used.

1）Setting the Full Rendering Switch

Use the renderer's SetRenderAll() method to set whether this scene uses full rendering. This method accepts a boolean value parameter.
``` Csharp
public void SetRenderAll
(
    bool _renderAll    // Whether to use full rendering, true indicates the use of full rendering, false indicates the use of streaming load rendering
)
```
Using this method can control whether a single scene uses full rendering.

2）Setting the Maximum Splat Quantity

Use the LCCManager's SetMaxRenderSplat(int _count) method to set the maximum rendering count. The parameter value range of this method is (0, 50,000,000), from 0 to 50 million.
``` Csharp
public void SetMaxRenderSplat
(
        int _count      // Maximum full rendering quantity
)
```
This operation will affect the data rendering of all scenes. 

If the conditions for full rendering are not met, the streaming load rendering process will be automatically performed.

It should be noted: To set the full rendering feature, this method must be called before the Load() method is invoked to take effect; otherwise, it will not work.

### SetAlpha()
The SetAlpha() method within the renderer object sets the global transparency. The prototype of this method is as follows:

``` Csharp
public void SetAlpha
(
float _alpha     // Transparency value, the range is [0,1], 0 indicates fully transparent, 1 indicates fully opaque
)
```
        
### SetClip()
SetClip() provided by Renderer is used to set runtime clipping. This method has three overloads. The prototype is as follows:
``` Csharp
/// <summary>
///return value
///0: success
///1: 2D List is null,or 2D List length is 0
///2：2D List elements more than 255
/// </summary>
public int SetHighlight(List<Data2D> _2Ds)
 
/// <summary>
///return value
///0: success
///1: 3D List is null,or 3D List length is 0
///2：3D List elements more than 255
///3：3D List geometry number is 0
/// </summary>
public int SetHighlight(List<Data3D> _3Ds)

/// <summary>
///return value
///0: success
///1: Mix List is null,or 2D List length is 0
///2：Mix List elements more than 255
/// </summary>
public int SetHighlight(List<DataMix> _Mix)
```
> Note：for more infomation, please refer to ： LCC data edit guide 。

Plane Clip

The SetClip() method within the renderer object is used for plane clipping, which only affects the rendering display of the data and does not actually modify the data. The prototype of this method is as follows:
``` Csharp
public void SetClip
(
    Vector3 _planePoint,            //point on the clip plane
    Vector3 _planeNormal,           //normal of the clip plane
    bool _inside = true             //Whether it is an inner clip, default is inner clip,plane use normal to decide direction
)
```
A typical calling code is as follows:
``` Csharp
   Vector3 _planePoint = m_plane.transform.position;
   Vector3 _planeNormal = m_plane.transform.up;
   m_renderer.SetClip( _planePoint,_planeNormal);
```
It should be noted that the clipping set by the SetClip() method only takes effect at the position of the clipping box at that time. If the position or orientation of the clipping box changes, this method needs to be called again.

To exit the clipping mode, you need to call QuitClipMode() method .

### SaveClip()
The SaveClip() method within the renderer object is used for save clipped data, this method will modify the raw data .currently ,this method can only be used at windows platform,  The prototype of this method is as follows:
``` Csharp
/// <summary>
///return value
///0: success
///1: 2D List is null,or 2D List length is 0
///2：2D List elements more than 255
/// </summary>
public int SaveClip(
    List<Data2D> _2Ds, 
    string _savePath, 
    Action<float> _callback, 
    DestFileType _fileType = DestFileType.LCC
)

/// <summary>
///return value
///0: success
///1: 3D List is null,or 3D List length is 0
///2：3D List elements more than 255
///3：3D List gemometry is 0
/// </summary>
public int SaveClip(
    List<Data3D> _3Ds, 
    string _savePath, 
    Action<float> _callback, 
    DestFileType _fileType = DestFileType.LCC
)

/// <summary>
///return value
///0: success
///1: 3D List is null,or 3D List length is 0
///2：3D List elements more than 255
/// </summary>
public int SaveClip(
    List<DataMix> _Mix
    string _savePath, 
    Action<float> _callback, 
    DestFileType _fileType = DestFileType.LCC
)
```
DestFileType is an enumeration class with enumeration values including { PLY,LCC },support to save as PLY or LCC data format.

> Note：for more infomation, please refer to ： LCC data edit guide 。

### GetBounds()
The GetBounds() method within the renderer object is used to retrieve the Axis-Aligned Bounding Box (AABB) of the scene. The prototype of this method is as follows:
``` Csharp
public void GetBounds
(
    out Vector3 max,       // The maximum point of the AABB
    out Vector3 min        // The minimum point of the AABB
)
```

### SetFov()
The LCC Unity SDK supports automatic Field of View (Fov) detection and adjustment. For example, when a user drags the rendering window or changes the screen resolution, the SDK will automatically detect and adjust the rendering accordingly, without the need of user intervention. For rendering cameras that are not screen-based (such as those from VR headsets), a manual Fov setting feature is also provided. The SetFov() method within the LCCManager object is used to manually refresh the Fov of the rendering camera. The prototype of this method is as follows:
``` Csharp
public void SetFOV
(
    int _width,          // Pixel width of the rendering window
    int _height,         // Pixel height of the rendering window
    float _verticalFov   // Vertical Field of View of the rendering camera
    )
```
It should be noted that under normal circumstances, there is no need to manually adjust the Fov through this method, as the SDK will automatically detect, recalculate, and handle it accordingly.

### GetSourceType()
The renderer provides the GetSourceType() method for obtaining data sources, and the prototype of this method is as follows:
``` Csharp
public SourceType GetSourceType()
```
SourceType is an enumeration type defined as follows:
``` Csharp
public enum SourceType 
{
    LCC,      //data from LCC
    PLY,      //data from PLY
    SPLAT,    //data from Splat
    None      //unknown
};
```

### GetDataType()
The renderer provides the GetDataType() method for obtaining data sources, and the prototype of this method is as follows:
``` Csharp
  public DataType GetDataType()
```

DataType is an enumeration type defined as follows:
``` Csharp
public enum DataType 
{
    L1,           //data from L1
    L2,           //data from L2
    K1,           //data from K1
    Drone,        //data from drone
    Drone_L2,     //data from drone and L2
    None          //unknown
};
```

### Dispose()
Destroy the renderer and release various resources. The prototype of this method has no parameters. The calling example is as follows:
``` Csharp
m_renderer.Dispose();
```
After destroying the scene, the renderer object becomes unusable and can be safely removed along with its associated Gameobjects

### SetStartLod()
The renderer provides the SetStartLod() method for dynamically loading the start LOD during rendering. LOD0 represents the node with the highest rendering quality and the largest amount of rendering data. LOD1, LOD2, LOD3... The rendering quality decreases in order, and the amount of rendering data also decreases in order. The default starting point for PC is LOD0, and for Mobile it is LOD1.
``` Csharp
public void SetStartLod(int _lod)
```
The parameter setting range is [0, total Level -1]. If it is less than 0, it will be adjusted to 0, and if it is greater than the maximum available LOD level, it will be adjusted to the maximum available LOD level.

> Notes：It should be noted that this method only works for non full rendering. On the PC side, when the total Splat data of LOD0 is less than 15 million, full rendering will be performed;

> This method works after calling the Load() method, and can be adjusted many times at runtime.

### SetEndLod()
The renderer provides the SetStartLod() method for dynamically loading the low LOD during rendering, and also provides the SetEndLod() method for limiting the maximum LOD. The prototype of this method is as follows:
``` Csharp
public void SetEndLod(int _lod)
```
The parameter setting range is [0, total Level -1]. If it is less than 0, it will be adjusted to 0, and if it is greater than the maximum available LOD level, it will be adjusted to the maximum available LOD level. This method mainly limits the issue of scene blurring caused by using high LOD levels when high rendering quality is required. The highest LOD level that can be used for high nodes is limited to the specified level.

> Note：this method only works for non full block rendering. On the PC side, when the total Splat data of LOD0 is less than 15 million, full rendering will be performed;

> This method works after calling the Load() method, and can be adjusted many times at runtime.

### SetMaxSplats()
***This method is only effective for mobile platforms (including Android, iOS) and non full load rendering PC devices*** (i.e. only effective for block rendering strategies)

This method sets the maximum number of Splats points for rendering. A larger number of Splats results in better rendering effects, but higher performance overhead. This method can be used to control rendering performance overhead. This method is usually used in conjunction with the SetMaxDistance() method.

Experience value：
1) PC platform [5-10 million]
2) Android platform [1-2 million]
3) IOS platform [1.5-3 million]

The parameter of this method is the number of Splats, and the calling example is as follows:
``` Csharp
m_renderer.SetMaxSplats(2000000);
```
This method may be used before or after calling the Load() method, and is equally effective.

### SetMaxDistance()
**This method is only effective for mobile platforms (including Android, iOS) and non full load rendering PC devices** (i.e. only effective for block rendering strategies)

This method sets the visual distance for rendering. A larger visual distance results in better rendering effects, but the performance cost increases. This method can be used to control the rendering performance cost. This method is typically used in conjunction with    the SetMaxSplat() method.

Experience value:
1) PC platform [80 meters -200 meters]
2) Android platform [20-40 meters]
3) IOS platform [30-50 meters]

The parameter of this method is distance, measured in meters. The following is an example of calling it:
``` Csharp
m_renderer.SetMaxDistance(200);
```
> This method may be used before or after calling the Load() method, and is equally effective.

> Notes : It should be noted that, for the balance of performance and rendering effects, the actual rendering distance is about twice the set distance. Node data is gradually distributed in LOD levels within the distance of [0, distance], and within the distance of [distance, 2 * distance] is the highest LOD level (the LOD level with the least amount of data)

### GetLoadRatio()
**This method is only effective for mobile platforms (including Android, iOS) and non full load rendering PC devices** (i.e. only effective for block rendering strategies)

This method is used to obtain the progress ratio at the first loading, with a range of [0, 1]. It is usually used to hide the initial scene loading process, that is, to present a relatively good data loading effect upon entering the scene. It can be selected according to the actual application.

The general practice is to first use a loading interface UI to mask the scene rendering after calling the Load() method, lock the camera (users are not allowed to operate the camera during the first loading process), and start a coroutine to check the loading progress value every 500ms. When the value is greater than a specified value, remove the masking interface UI and stop the coroutine.

Experience value:

1）0.85

The return value of this method is float. The calling example is as follows:
``` Csharp
float ratio = m_renderer.GetLoadRatio();
```

> Notes: It should be noted that during block rendering, data loading will occur at any time according to the camera's perspective. This method is only used to present a relatively complete scene when entering the scene for the first time, hiding the data loading process when entering the scene for the first time. However, it does not download all scene data.

### SetColliderEnable()
The SetColliderEnable() method in the renderer object is used to enable collision. After enabling collision detection, it can participate in physical operations to prevent model penetration. This method requires collision file support. The prototype of this method is as follows:
``` Csharp
public bool SetColliderEnable
(
    bool _enable,             //enable or disable collision
)
```
Collision supports block loading, which generates collision mesh within a certain range in all areas of the camera and dynamically loads or unloads collision nodes as the camera moves, but ensures collision effects within a certain range around the camera.

The return value of this method is used to indicate whether the collision has been successfully initiated. True indicates successful collision activation, while false indicates failed collision activation.

### RaycastMesh()
The method takes effect after the scene collision is successfully activated., which works when there is collision file in the LCC data path. This method takes the input as Ray in the Unity world coordinate system (with the ray origin and direction as input parameters). This method will return the result of the ray detection boolean value, with true indicating collision and false indicating no collision detected. When the return value is true, HitResult stores the ray detection result.
``` Csharp
public bool RaycastMesh
(
    Ray _rayW,                   //Ray under Unity world coordinate system
    out HitResult _result        //Collision result
 )

//overload
public bool RaycastMesh
(
    Ray _rayW,                   //Ray under Unity world coordinate system
    out HitResult _result,       //Collision result
    out Bounds _hitBounds,       //memo1
    float _disatnce = 70.0f      //Maximum effective distance
)
```

memo1： 
The hitBounds in the overload method are mainly used for camera control in Cinemachine Collider. Each frame will use ray detection to determine whether there is an obstruction between the camera and the digital person. If there is, it will bring the camera closer to the digital person, avoiding the camera from being unable to capture the digital person. hitBounds is the ray detection that returns the nearest bounding box, limiting the distance of the ray within the boundary range of the bounding box. It will check the intersection point of the ray and the boundary, and adjust the distance of the ray based on the position of the intersection point to ensure that the ray does not exceed the boundary.

The collision result object HitResult is defined as follows:
``` Csharp
   public struct HitResult
{
    public bool isHit;          // Whether a collision occurred
    public float distance;      // Distance between the collision point and the camera
    public Vector3 hitPos;      // Position of the collision point in world space
    public float dist2Origin;   // Distance of the collision point from the ray origin
}
```

### SetGraphicsAPI()
The SetGraphicsAPI() method in the renderer object is used to dynamically set the graphics API used at runtime. This method is only useful for DirectX11 and DirectX12 on Windows, and is used to switch between them. The prototype of this method is as follows:
``` Csharp
public void SetGraphicsAPI(GraphicsDeviceType _type){    }
```

> Notes：On Windows platform, when LCC scene rendering is abnormal, you can try to fix it by switching the graphics API used through this interface.

### SetZDepth()
The SetZDepth() method in the renderer object is used to enable LCC scene depth writing and achieve occlusion with transparent and Opaque objects. The prototype of this method is as follows:
``` Csharp
public bool SetZDepth
(
    bool _zwrite,             //Enable or disable deep writing
)
```
After enabling LCC scene depth writing, the LCC scene can be occluded with other objects in the scene.

> Notes：Due to the 3DGS technology which uesed in LCC, the occlusion is not perfect, especially at the edges where elliptical abnormal occlusion areas may appear.

### AddCamera()
The AddCamera() provided by the LCCManager component is used to implement multi camera rendering in LCC scenes. The prototype of the AddCamera() method is as follows:

``` Csharp
public void AddCamera
(
    Camera _cam              // rendering camera
)
```
Multi camera rendering supports two rendering modes, LCC and point cloud, and can be independently set. By default, LCC mode is used for rendering. Setting the Camera Tag to "points" will render the camera in point cloud mode. 

The RemoveCamera() method corresponding to the AddCamera() method is used to remove a camera. The prototype of the RemoveCamera() method is as follows:

``` Csharp
public void RemoveCamera
(
    Camera _cam              // rendering camera
)
```
> Notes：The main camera in the scene (tagged as MainCamera) does not need to be manually added.

### IntersectsSphere
The IntersectsSphere() provided by the renderer is used to implement collision testing between spheres and scenes. This method is commonly used for object control in scenes. The prototype of the IntersectsSphere() method is as follows:
``` Csharp
public bool IntersectsSphere
(
    Sphere _sphereW        //sphere in worldspace
)

//overload
public bool IntersectsSphere
(
    Sphere _sphereW,        //sphere in worldspace
    out Vector3 _delta      //If the sphere collides with the scene, this value returns the offset distance without collision, 
                            //usually used for object position setting. This value is already in world space
)
```

### IntersectsCapsule
The IntersectsCapsule() provided by the renderer is used to implement collision testing between capsule bodies and scenes. This method is commonly used for digital human control in scenes. The prototype of the IntersectsCapsule() method is as follows:
``` Csharp
public bool IntersectsCapsule
(
    Capsule _capsuleW       //capsule in the world space
)

//overload
public bool IntersectsCapsule
(
    Capsule _capsuleW,      //capsule in the world space
    out Vector3 _delta      //If the capsule body collides with the scene, this value returns the offset distance that did not collide. 
                            //It is usually used for setting the position of digital humans to prevent them from passing through the mold. This value is already  in world space
)
```

### TriggerVFX
The TriggerVFX() method in the renderer object is used to trigger vfx effect, It is usually called in the callback method of the Load() method. The prototype of this method is as follows:
``` Csharp
public bool TriggerVFX
(
    Vector3 _vfxOriginW             //VFX start position in the world space
)
```

### SetSemantic
The Settemantic() provided by the renderer is used to implement AI semantic shading. The prototype of this method is as follows:
``` Csharp
public bool SetSemantic
(
    bool _enable,                //enable semantic or not
    Vector4[] _color = null      //The color array for semantic shading can be left as default, but if it is set, the length of the array must be 100
)   
```

> Noted：This method relies on AI semantic labeling of the data. If LCC data has not undergone AI semantic labeling, it will not be effective. Therefore, please ensure that there are AI semantic id in the LCC data before using this method.

### SetCrack
The SetCrack() method provided by the renderer is used to repair crack defects during chuck rendering. The prototype of this method is as follows:
``` Csharp
public bool SetCrack
(
    bool _clip,                //enable or not
)   
```
> Note：This method is only effective for chunck rendering and is not necessary when using full rendering. Using this method may result in rendering very large ellipsoids, such as sky backgrounds, into square patches. Therefore, it is recommended not to enable it by default and to enable it when needed.

### SetRaycastDelta
SetRaycastDelta () provided by Renderer is used to set the detection range of Gaussian primitive (define the radius of ray cylinder) when using raycast method. Only collision points within this radius will be selected. The prototype of this method is as follows:
``` Csharp
public bool SetRaycastDelta
(
    float _delta,                //radius，range [0.01,10], meter
)   
```

### SetHighlight
SetHighlight() provided by Renderer is used to set data highlighting. This method has three overloads. The prototype is as follows:
``` Csharp
/// <summary>
///return value
///0: success
///1: 2D List is null,or 2D List length is 0
///2：2D List elements more than 255
/// </summary>
public int SetHighlight(List<Data2D> _2Ds)
 
/// <summary>
///return value
///0: success
///1: 3D List is null,or 3D List length is 0
///2：3D List elements more than 255
///3：3D List geometry number is 0
/// </summary>
public int SetHighlight(List<Data3D> _3Ds)

/// <summary>
///return value
///0: success
///1: Mix List is null,or 2D List length is 0
///2：Mix List elements more than 255
/// </summary>
public int SetHighlight(List<DataMix> _Mix)  
```
> Note：for more infomation, please refer to ： LCC data edit guide 。

### SetTone
SetTone() provided by Renderer is used to set the color of scene data. The prototype is as follows:
``` Csharp
/// <summary>
///return 
///-1: requirements are not met
///0: success
///1: Mix List is null,or 2D List length is 0
///2：Mix List elements more than 255
/// </summary>
public int SetTone(List<ToneMix> _Mix)
```

> Note：for more infomation, please refer to ： LCC data color edit guide 。

### SaveAs
The SaveAs() method provided by Renderer is mainly used to save the editing results after clipping and color editing. The prototype of this method is as follows:
``` Csharp
/// <summary>
///return
///0: success
///1: cMix and tMix is null
///2：cMix List elements count greater than 255
///3：tMix List elements count greater than 255
///4：no enough memory
///5：no enough HDD space
/// </summary>
public int SaveAs
(
    List<DataMix> _cMix,                       //for clip，can be Null
    List<ToneMix> _tMix,                       //for color edit, can be Null
    string _savePath,                          //save path
    Action<float> _callback,                   //callback method
    DestFileType _fileType = DestFileType.LCC  //save file type
    bool _repair = false                       //need repair chunk render crack or not
)
```
> Note：for more infomation, please refer to ： LCC data color edit guide  or  LCC data edit guide 。
  （1） When the save type is PLY, the file path must be specified to the xx.ply file; whereas when exporting to LCC type, it is only necessary to specify the folder path;
  （2） Due to the adoption of a multithreading mechanism, callback functions are triggered by sub-threads, and it is not allowed to manipulate UI and rendering-related functions within callback functions.

### GetBounds
The GetBounds() method provided by Renderer is mainly used to obtain the bounding box of the LCC scene. The obtained bounding box is already in the world coordinate system. The prototype of this method is as follows:
``` Csharp
public int GetBounds
(
    out Vector3 max,
    out Vector3 min
)
```
    
### GetMeta
The GetMeta method provided by Renderer is mainly used to obtain the metadata information of LCC data. This method has two overloads. The prototype is as follows:
``` Csharp
//This method is applicable to obtaining metadata before loading LCC data by using the Load() method
public bool GetMeta
(
    string _filePath,         //*.lcc file path
    out SplatMeta _metaData   // returned metadata structure
)

//This method is applicable to obtaining metadata after loaded LCC data using the Load() method
public bool GetMeta
(
    out SplatMeta _metaData   //returned metadata structure
)
```

### Export
The Export method provided by Renderer is used to export LCC data. The prototype is as follows:
``` Csharp
public bool Export
(
    string _savePath,                             //file path
    Action _callBack,                             //callback
    DestFileType _fileType = DestFileType.LCC     //save file type
)


//example
public void OnExport()
{
    string _path = "G:\\TestData\\3dgs.ply";
    m_renderer.Export(_path, exportCallback, DestFileType.PLY);
}
    
private void exportCallback()
{
    Debug.Log("export completed.");
}
```

> Note：
  （1） When the save type is PLY, the file path must be specified to the xx.ply file; whereas when exporting to LCC type, it is only necessary to specify the folder path;
  （2） Due to the adoption of a multithreading mechanism, callback functions are triggered by sub-threads, and it is not allowed to manipulate UI and rendering-related functions within callback functions.

### SetLockFPS
When the LCC scene is rendering, the default maximum frame limit to 120FPS, and the default static (camera position and rotation do not change) rendering frame limit to 24FPS. However, the SetLockFPS method provided by the LCCManager can be used to turn on or off the lock frame action. The prototype of this method is as follows:
``` Csharp
public void SetLockFPS
(
    bool _isLock     //enable or disable FPS Lock
)
```
> Note：On laptops, tablets, and mobile devices, it is recommended to enable the lock frame function, which helps reduce invalid performance consumption and device heating.