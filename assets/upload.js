/**
 * 头像上传组件
 * 
 * 这个文件作为入口点，被保留用于兼容性，
 * 主要功能已移至Vue组件 AvatarUploader.js
 */
// 初始化全局变量以便Vue组件可以访问
const maxAvatarResolution = mw.config.get('wgMaxAvatarResolution');

// MediaWiki会自动加载这个文件以及AvatarUploader.js
// 因此不需要在这里做额外的初始化