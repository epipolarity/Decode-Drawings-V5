# Radu's 'Decode the Drawings' Coding Competition - Final Submission

<https://radufromfinland.com/decodeTheDrawings/>  
<https://www.youtube.com/watch?v=bZ8uSzZv0ew>

Radu recorded 6 videos with a camera mounted on top of a pen as he drew different shapes/pictures while the camera pointed at three coloured balls attached to a wall.

The challenge was to track the balls in the video and use their relative positions and motion to decode what was being drawn as the camera moved with the pen.

Something like this:

<img src="images/visual_documentation.png" alt="Visual description of the challenge" title="Visual description of the challenge" />


# My Results

You can find the XY image coordinate TXT files at `results/coords_#.txt`. Here are the decoded drawing images, scored on the competition test page (<https://radufromfinland.com/decodeTheDrawings/test/index.html>):

<img src="results/20250731 results v2.png" alt="Results - average accuracy 95.3%" title="Results - average accuracy 95.3%" />

# Usage

To run this code on your own machine, you will need a local http server. I suggest Live Server for VS Code: <https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer>

There are two possible workflows:

1. Video Decoding - decoding an mp4 video file directly to see the resultant drawing
2. Data file Decoding - decoding a data file, derived from an mp4 video, to see the resultant drawing

Method 1 is necessary for previously unseen mp4 video files, and method 2 is preferred for reprocessing videos that have already been seen once, as it is much faster. I include the derived data files in the repository so you may skip straight to method 2, but method 1 is more enjoyable to watch the drawing take shape in real time.

## Video Decoding

Clone this repository to your system, and download the input videos from Radu here: https://kareliauas-my.sharepoint.com/:u:/g/personal/210618a_karelia_fi/ERgUAjdIjXxEhCTNa74-wIgBxhcLP8GLfGab8iiwHUaZDQ?e=7TPxK6

Copy the videos 1-6.mp4 to the videos directory and use a browser to access the index.html page on your local server. If you want to try with a different mp4 file, add it to the videos folder and follow the instructions within the index.html code to make the file selectable (just add another option to the video input select element)

After loading index.html in your browser, the top left video input should list the available input videos. Choose any one to load the video and watch the drawing take shape in the large square drawing canvas. 

You can't stop a video once it's started, unless you close/refresh the page, or choose another video.

Changing any of the decoding parameters will have no effect once the video decoding has started.

You may need to scroll to the bottom of the page to see the video, which will also show overlaid outlines of the detected balls.

Once the video has reached the end, you can scroll further down, below the video to see 2 textareas. The left textarea shows the detected ball outline coordinates, and a button to download this. The textarea only shows a truncated preview, so use the button to download the full version, and use it as described below in `Data file Decoding` for more rapid decoding, to test different parameters.

The right textarea shows the pixel coordinates of every point in the decoded image, and this can be downloaded for submission to the test page (<https://radufromfinland.com/decodeTheDrawings/test/index.html>) or however you choose!

Video decoding has a couple of other limitations compared to data file decoding. The 'check circle fit' option has no effect in video decoding mode, and the canvases to the side of and below the main drawing canvas do not show the side and front view of points in 3D, as they do in 'data file mode'.

## Data file Decoding

After cloning this repository you should find a zip file in the data directory, containing the detected ball outlines for each frame of the 6 input videos.

Extract these 6 files to the data directory, or add files that you generated using method 1 above. If you generated a file for a different video than the 6 provided, you will need to add an option to the data file select element in the index.html file, and the specific details of how to do this are described within the index.html file.

Now, after loading the index.html page, you can choose the relevant data file input from the data file input dropdown, and it should be very quickly decoded and displayed in the main drawing canvas.

Now any changes to the decoding parameters will cause the input file to be processed again with the new settings, so you can get instant feedback on the effect of the parameter change.

## Decoding parameters/options

These parameters and options will be described in more detail further below, but here is an overview.

Changing these parameters while a video is being decoded will have no effect until the next video is loaded. They also have no effect until a data file is loaded, but changing them will automatically trigger reloading the current data file if one is selected, which gives the illusion of them having an instant effect in that case.

These parameters are preset with good default values that I have determined through manual trial and error, normally starting from sensible estimates.

- **Smoothing**: Default 0.9  
Smoothing is applied to the calculated centroid and radius of the balls in subsequent frames, before further processing is applied.  
This is the weight of effect of the previous frame on the current frame. So if smoothing is 0 the previous frame has no influence, and if smoothing was 1 the current frame would have no influence (and so nothing would ever change). 
- **Z Threshold**: Default 3.45 (cm - relative to what, I'm not sure!)  
The decoder calculates an XYZ position for the tip of the pen at each frame. The Z Threshold allows you to set a Z level above which to ignore the pen as it is likely not in contact with the drawing surface.
- **Focal Length**: Default X=615, Y=615 (pixels)  
It's possible for lenses to have different focal lengths in different directions, though the difference is normally very small. This relates to how wide or narrow the field of view is, and is used in the decoder to work out the angle between things in the scene and the camera's optical axis. The value of 615 pixels was calculated based on the known size of, and distance to, the balls in frame 1 of the first video, and I haven't yet found a better value!
- **Optical Centre**: Default X=664, Y=389.8 (pixels)  
This is the coordinates of the pixel on the sensor which captures light which passed directly though the lens without any deviation from a straight path (refraction)  
It should be the middle, but lenses and sensors are not always placed in cameras to this level of precision
This is the baseline from which i measure angles to objects (balls) in each frame
- **Distortion K1**: Default 0.000000319  
The K1 coefficient is used to correct for first order radial distortion (barrel/pincushion) where the magnification varies in the image with distance to the optical centre
- **Tilt Factors**: Default X=150, Y=250  
These are slightly hacky fudge-factor numbers of arbitrary scale and meaning  
I make a simplistic estimate of whether the camera is tilted forwards/backwards/sidewards, and by how much, and multiply that amount by these numbers to get an XY offset from the camera position to the pen tip position.
Without this, we are only tracking the position of the camera, and not accounting for the fact that the pen tip is somewhere else if the pen is not completely vertical.
- **Ball Radius**: Default 3.19 (cm)  
Though we know the balls to have a radius of 3cm, I found that I got better results by making this a variable and adjusting it up to 3.19cm. This implies some error in my code/maths that I have not yet identified.
- **Check Circle Fit**:  
This only works when decoding data files, and only makes sense when doing it for data file #1, but this will calculate a best fit circle for the current decoded drawing and display an error value indicating how far the drawing is from perfectly fitting it.  
The circle fitting algorithm is non-deterministic so you will get slightly different results for the same input, so try it a few times on and off, or with different parameters to get a 'feel' for the true value!


# My Solution(s)

This submission is my 5th and final version, after trying several different approaches. 

Versions 1-3 can be found here (<https://github.com/epipolarity/Decode-Drawings>) reasonably well documented.

Version 4 can be found here (<https://github.com/epipolarity/Decode-Drawings-V4>) but this was a failed attempt to use PnP pose estimation, and it never seemed worthwhile to document it because it didn't work. This was the only version for which I used any external libraries and consulted with LLMs to understand the maths. I feel like every time I attempt to get my head around linear algebra I get a little closer, but then need a few years recovery before trying again...

This is Version 5, which is quite closely related to Version 3 but with an approach based on angles relative to the camera optical axis, rather than pixel coordinates in the image plane.

The reason for this change was that I was not happy with my method in V3 for correcting for the elongation effect, observed on the image plane in a pinhole camera as objects move futher from the centre.

The difference between the two camera models can be seen in the below image.

<img src="images/pinhole_vs_fisheye.png" alt="Fisheye vs Rectilinear model" title="Fisheye vs Rectilinear model" />

The red line at the bottom represents the standard image plane. This is the image sensor in most cameras, and it has the desirable property that lines which appear straight in the real world (the edges of a building, for example) always also appear straight in the image. This model also has the undesirable property that objects appear elongated the further they are from the optical centre. Notice that the mid point of each ball is not projected to the midpoint of where the edges of the ball appear in the image plane. 

This was the reason my V3 decoder struggled, as I did not have a good method for compensating for this elongation. I had a bad method, based on correction factors, based on observervation, but not based on geometry.

The green line in the image above represents my solution to this, which I believe is related to the fisheye camera project model. This does not preserve straight lines in an image, but has the desirable property that the mid point of the ball is projected to the mid point of where the edges of the ball are projected on the image plane. In this model image coordinates are treated as angles from the optical centre, rather than cartesian coordinates on a plane. 

We still have to convert from cartesian pixel coordinates to these angular coordinates, but this is possible if we know (or estimate, or fine-tune through trial and error) the camera focal length and optical centre, and much simpler than what I was doing with correction factors previously.

## Stage 1 - Ball Detection

The first stage of the process is to detect the balls in each video frame. In versions 1-4 I used the same approach, described here (<https://github.com/epipolarity/Decode-Drawings#2-ball-detection>) based entirely on the Marker Detection algorithm described by Radu here: <https://www.youtube.com/watch?v=jy-Mxbt0zww>.

For this version, I gave the detection algorithm a slight upgrade - it now outputs the outline of each ball as a series of 2D pixel coordinates, rather than just outputting the centroid and radius.

This was necessary for two reasons.

1. As described above, the balls are elongated in the frame, not round, and the center of the ball is not at the center of the elongated shape (it's somewhere nearer the optical centre).
2. To correct for radial lens distortion and this elongation effect we need to treat each part of the ball outline differently, as they all have different distances from the optical centre, and a series of points around the edge of the ball is one way to do this.

See the difference in detection methods in the animated gif below, and note how the prevoius method does not conform to the subtle elongation of the balls (most notable in green and blue).

<img src="images/ball_outlines.gif" />

The detection algorithm starts with Radu's marker detection method to establish a good estimate of the centroid and radius, but rather than stop there it uses these as a starting point for a process to iteratively refine the outline. 

For each point in the outline, it searches a 7x7 pixel area centred on that point, and counts the number of pixels in that area that exceed the given colour strength threshold. If more than half the points exceed the threshold the point is deemed to be too close to the ball centre, and it moves outwards (relative to the mean position of all points) and if fewer than half the points exceed the threshold it moves towards the centre, hopefully settling in a location where the number of points the exceed the threshold balances those that do not, and we take this to be the edge of the ball.

This method works well despite the obvious issues that there is no way for half of the pixels in an odd number (49) to balance the other half, and that actually slightly fewer than half the pixels in a square centred on the edge of a circle (or ellipse) would actually be contained by that circle (or ellipse)!

There are certainly better and more generalised algorithms for calculating the contour of a shape, but I enjoyed the process of developing this one myself, and this is a common theme throughout this project and my work in general!

