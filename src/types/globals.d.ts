// Tell TypeScript that CSS files are valid imports (side-effect only)
declare module '*.css' {
  const content: { [className: string]: string }
  export default content
}