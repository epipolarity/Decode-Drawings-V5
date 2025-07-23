// transform any point in the original distorted image to a xy position in an ideal pinhole camera model
// using division model with single distortion term k1: https://en.wikipedia.org/wiki/Distortion_(optics)
// full distortion model uses multiple terms k1...kn and more for tangential and decentering distortion
// but more than 1 term would be hard to tune through trial and error, and 1 term gets us a lot of the way
// negative k1 = barrel distortion / positive k1 = pincushion
export function undistortPoint(point, center, k1) {
    const { x, y } = point;
    const { x: cx, y: cy } = center;
    const r = Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2));
    const newX = cx + ((x - cx) / (1 + (k1 * Math.pow(r, 2))));
    const newY = cy + ((y - cy) / (1 + (k1 * Math.pow(r, 2))));
    return { x: newX, y: newY };
}