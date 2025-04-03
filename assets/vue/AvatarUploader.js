/**
 * Avatar Uploader Vue Component
 * 
 * 使用Codex组件实现头像上传和裁剪功能
 */
(function() {
    'use strict';

    // 组件注册
    mw.loader.using([
        'vue',
        'codex',
        'codex-button',
        'codex-icons'
    ]).then(function() {
        // 定义Vue组件
        const AvatarUploader = {
            template: `
                <div class="cdx-avatar-uploader">
                    <div v-if="!imageLoaded" class="avatar-current-container">
                        <img :src="currentAvatarUrl" class="current-avatar" />
                        <p>{{ mw.msg('uploadavatar-nofile') }}</p>
                    </div>
                    
                    <div v-if="imageLoaded" class="cropper-container" ref="cropperContainer">
                        <img :src="selectedImageUrl" ref="imageObj" :style="imageStyle" />
                        <div 
                            class="cropper" 
                            ref="cropper"
                            :style="cropperStyle"
                            @mousedown="onDragStart"
                        >
                            <div class="tl-resizer" @mousedown.stop="onResizeStart('tl')"></div>
                            <div class="tr-resizer" @mousedown.stop="onResizeStart('tr')"></div>
                            <div class="bl-resizer" @mousedown.stop="onResizeStart('bl')"></div>
                            <div class="br-resizer" @mousedown.stop="onResizeStart('br')"></div>
                            <div class="round-preview"></div>
                        </div>
                        <p>{{ mw.msg('uploadavatar-hint') }}</p>
                    </div>
                    
                    <div class="error-message" v-if="errorMsg">{{ errorMsg }}</div>
                    
                    <div class="avatar-actions">
                        <input ref="fileInput" type="file" accept="image/*" style="display:none" @change="onFileSelected" />
                        <cdx-button action="progressive" @click="selectFile">
                            {{ mw.msg('uploadavatar-selectfile') }}
                        </cdx-button>
                        <cdx-button action="progressive" @click="uploadAvatar" :disabled="!canSubmit">
                            {{ mw.msg('uploadavatar-submit') }}
                        </cdx-button>
                    </div>
                </div>
            `,
            
            data() {
                return {
                    currentAvatarUrl: mw.config.get('wgScriptPath') + '/extensions/Avatar/avatar.php?user=' + mw.user.id() + '&res=original&nocache&ver=' + Math.floor(Date.now()/1000).toString(16),
                    selectedImageUrl: '',
                    imageLoaded: false,
                    errorMsg: '',
                    imageWidth: 0,
                    imageHeight: 0,
                    visualWidth: 0,
                    visualHeight: 0,
                    cropperSize: 100,
                    cropperLeft: 0,
                    cropperTop: 0,
                    minDimension: 64,
                    maxVisualHeight: 400,
                    multiplier: 1,
                    dragMode: 0,
                    isDragging: false,
                    startOffset: { left: 0, top: 0, width: 0, height: 0 },
                    startX: 0,
                    startY: 0
                };
            },
            
            computed: {
                imageStyle() {
                    return {
                        width: this.visualWidth + 'px',
                        height: this.visualHeight + 'px'
                    };
                },
                cropperStyle() {
                    return {
                        width: this.cropperSize + 'px',
                        height: this.cropperSize + 'px',
                        left: this.cropperLeft + 'px',
                        top: this.cropperTop + 'px'
                    };
                },
                canSubmit() {
                    return this.imageLoaded;
                }
            },
            
            methods: {
                // 选择文件
                selectFile() {
                    this.$refs.fileInput.click();
                },
                
                // 处理文件选择
                onFileSelected(e) {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            this.selectedImageUrl = event.target.result;
                            
                            // 检查图片加载后的尺寸
                            const img = new Image();
                            img.onload = () => {
                                this.imageWidth = img.width;
                                this.imageHeight = img.height;
                                
                                if (this.imageWidth < this.minDimension || this.imageHeight < this.minDimension) {
                                    this.errorMsg = mw.msg('avatar-toosmall');
                                    this.imageLoaded = false;
                                    return;
                                }
                                
                                this.errorMsg = '';
                                this.imageLoaded = true;
                                
                                // 计算显示尺寸
                                this.visualHeight = this.imageHeight;
                                this.visualWidth = this.imageWidth;
                                
                                if (this.visualHeight > this.maxVisualHeight) {
                                    this.visualHeight = this.maxVisualHeight;
                                    this.visualWidth = this.visualHeight * this.imageWidth / this.imageHeight;
                                }
                                
                                this.multiplier = this.imageWidth / this.visualWidth;
                                
                                // 初始化裁剪区域为居中正方形
                                const maxSize = Math.min(this.visualWidth, this.visualHeight);
                                this.cropperSize = maxSize;
                                this.cropperLeft = (this.visualWidth - maxSize) / 2;
                                this.cropperTop = (this.visualHeight - maxSize) / 2;
                                
                                // 下一帧更新后更新隐藏字段
                                this.$nextTick(() => {
                                    this.updateHiddenField();
                                });
                            };
                            img.src = this.selectedImageUrl;
                        };
                        reader.readAsDataURL(file);
                    }
                },
                
                // 开始拖动裁剪框
                onDragStart(event) {
                    if (this.isDragging) return;
                    
                    this.isDragging = true;
                    this.dragMode = 0;
                    
                    const cropperRect = this.$refs.cropper.getBoundingClientRect();
                    this.startOffset = {
                        left: this.cropperLeft,
                        top: this.cropperTop,
                        width: this.cropperSize,
                        height: this.cropperSize
                    };
                    this.startX = event.pageX;
                    this.startY = event.pageY;
                    
                    document.addEventListener('mousemove', this.onDrag);
                    document.addEventListener('mouseup', this.onDragEnd);
                    
                    event.preventDefault();
                },
                
                // 开始调整大小
                onResizeStart(corner) {
                    if (this.isDragging) return;
                    
                    this.isDragging = true;
                    
                    // 设置拖动模式: tl=1, tr=2, bl=3, br=4
                    switch(corner) {
                        case 'tl': this.dragMode = 1; break;
                        case 'tr': this.dragMode = 2; break;
                        case 'bl': this.dragMode = 3; break;
                        case 'br': this.dragMode = 4; break;
                    }
                    
                    this.startOffset = {
                        left: this.cropperLeft,
                        top: this.cropperTop,
                        width: this.cropperSize,
                        height: this.cropperSize
                    };
                    this.startX = event.pageX;
                    this.startY = event.pageY;
                    
                    document.addEventListener('mousemove', this.onDrag);
                    document.addEventListener('mouseup', this.onDragEnd);
                    
                    event.preventDefault();
                },
                
                // 拖动处理
                onDrag(event) {
                    if (!this.isDragging) return;
                    
                    const containerRect = this.$refs.cropperContainer.getBoundingClientRect();
                    const outer = {
                        left: 0,
                        top: 0,
                        width: this.visualWidth,
                        height: this.visualHeight
                    };
                    
                    const deltaX = event.pageX - this.startX;
                    const deltaY = event.pageY - this.startY;
                    
                    switch(this.dragMode) {
                        case 0: // 移动整个裁剪框
                            this.cropperLeft = this.startOffset.left + deltaX;
                            this.cropperTop = this.startOffset.top + deltaY;
                            
                            // 限制在容器内
                            this.cropperLeft = Math.max(0, Math.min(this.cropperLeft, this.visualWidth - this.cropperSize));
                            this.cropperTop = Math.max(0, Math.min(this.cropperTop, this.visualHeight - this.cropperSize));
                            break;
                            
                        case 1: // 左上角调整
                            const sizeDelta1 = Math.min(deltaX, deltaY);
                            const newSize1 = this.startOffset.width - sizeDelta1;
                            
                            if (newSize1 >= this.minDimension / this.multiplier) {
                                this.cropperSize = newSize1;
                                this.cropperLeft = this.startOffset.left + this.startOffset.width - newSize1;
                                this.cropperTop = this.startOffset.top + this.startOffset.height - newSize1;
                                
                                // 限制在容器内
                                this.cropperLeft = Math.max(0, this.cropperLeft);
                                this.cropperTop = Math.max(0, this.cropperTop);
                            }
                            break;
                            
                        case 2: // 右上角调整
                            const sizeDelta2 = Math.max(deltaX, -deltaY);
                            const newSize2 = this.startOffset.width + sizeDelta2;
                            
                            if (newSize2 >= this.minDimension / this.multiplier && 
                                this.startOffset.left + newSize2 <= this.visualWidth) {
                                this.cropperSize = newSize2;
                                this.cropperTop = this.startOffset.top + this.startOffset.height - newSize2;
                                
                                // 限制在容器内
                                this.cropperTop = Math.max(0, this.cropperTop);
                            }
                            break;
                            
                        case 3: // 左下角调整
                            const sizeDelta3 = Math.max(-deltaX, deltaY);
                            const newSize3 = this.startOffset.width + sizeDelta3;
                            
                            if (newSize3 >= this.minDimension / this.multiplier && 
                                this.startOffset.top + newSize3 <= this.visualHeight) {
                                this.cropperSize = newSize3;
                                this.cropperLeft = this.startOffset.left + this.startOffset.width - newSize3;
                                
                                // 限制在容器内
                                this.cropperLeft = Math.max(0, this.cropperLeft);
                            }
                            break;
                            
                        case 4: // 右下角调整
                            const sizeDelta4 = Math.min(
                                Math.min(this.visualWidth - this.startOffset.left, deltaX),
                                Math.min(this.visualHeight - this.startOffset.top, deltaY)
                            );
                            const newSize4 = this.startOffset.width + sizeDelta4;
                            
                            if (newSize4 >= this.minDimension / this.multiplier) {
                                this.cropperSize = newSize4;
                            }
                            break;
                    }
                    
                    this.updateHiddenField();
                },
                
                // 拖动结束
                onDragEnd() {
                    this.isDragging = false;
                    document.removeEventListener('mousemove', this.onDrag);
                    document.removeEventListener('mouseup', this.onDragEnd);
                    this.updateHiddenField();
                },
                
                // 更新隐藏字段
                updateHiddenField() {
                    if (!this.imageLoaded) return;
                    
                    const maxRes = mw.config.get('wgMaxAvatarResolution');
                    
                    // 裁剪图像
                    const dim = Math.round(this.cropperSize * this.multiplier);
                    const res = Math.min(dim, maxRes);
                    
                    // 创建canvas并裁剪
                    const canvas = document.createElement('canvas');
                    canvas.width = res;
                    canvas.height = res;
                    const ctx = canvas.getContext('2d');
                    
                    // 获取原始图像对象
                    const img = this.$refs.imageObj;
                    
                    // 裁剪并绘制到canvas
                    ctx.drawImage(
                        img,
                        this.cropperLeft * this.multiplier,
                        this.cropperTop * this.multiplier,
                        dim, dim,
                        0, 0, res, res
                    );
                    
                    // 更新隐藏字段值
                    const dataUrl = canvas.toDataURL('image/png');
                    document.querySelector('[name=avatar]').value = dataUrl;
                    
                    // 更新预览边框颜色
                    const imageData = ctx.getImageData(0, 0, res, res).data;
                    let r = 0, g = 0, b = 0, c = 0;
                    for (let i = 0; i < imageData.length; i += 4) {
                        c++;
                        r += imageData[i];
                        g += imageData[i + 1];
                        b += imageData[i + 2];
                    }
                    
                    const roundPreview = this.$refs.cropper.querySelector('.round-preview');
                    if (roundPreview) {
                        roundPreview.style.borderColor = `rgb(${256 - Math.round(r / c)}, ${256 - Math.round(g / c)}, ${256 - Math.round(b / c)})`;
                    }
                },
                
                // 上传头像
                uploadAvatar() {
                    if (!this.imageLoaded) return;
                    
                    // 表单提交是通过现有的HTML表单完成的
                    // 我们只需要确保隐藏字段已更新
                    this.updateHiddenField();
                    document.querySelector('form').submit();
                }
            }
        };
        
        // 初始化Vue应用
        $(function() {
            const app = Vue.createApp(AvatarUploader);
            app.use(Codex);
            
            // 注册所需的Codex组件
            app.component('cdx-button', Codex.CdxButton);
            app.component('cdx-icon', Codex.CdxIcon);
            
            // 将Vue挂载到页面
            const container = document.createElement('div');
            container.id = 'avatar-uploader-app';
            
            // 插入表单前
            const form = document.querySelector('form');
            if (form) {
                form.parentNode.insertBefore(container, form);
                app.mount('#avatar-uploader-app');
                
                // 隐藏原始表单，但保留提交功能
                const hiddenFields = form.querySelectorAll('input[type=hidden]');
                hiddenFields.forEach(field => field.style.display = 'none');
                form.style.display = 'none';
            }
        });
    });
})();
