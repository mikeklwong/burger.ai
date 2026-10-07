import * as React from 'react';
/** @typedef {React.ImgHTMLAttributes<HTMLImageElement> & {fittingType?: string}} ImageProps */
/** @type {React.ForwardRefExoticComponent<ImageProps & React.RefAttributes<HTMLImageElement>>} */
const Image = React.forwardRef(function Image({ fittingType = 'fill', style, alt = '', ...props }, ref) {
  return <img ref={ref} alt={alt} loading="lazy" {...props} style={{ objectFit: fittingType === 'fit' ? 'contain' : 'cover', ...style }} />;
});
export { Image };
