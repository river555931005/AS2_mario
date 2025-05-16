/**
 * 相機控制器
 * 負責相機跟隨目標和邊界限制
 */

const { ccclass, property } = cc._decorator;

@ccclass
export default class CameraController extends cc.Component {
    @property({
        type: cc.Node,
        tooltip: '相機跟隨的目標節點（通常是玩家）'
    })
    public target: cc.Node = null;

    @property({
        tooltip: '相機相對於目標的偏移位置'
    })
    public offset: cc.Vec2 = cc.v2(0, 100);
    
    @property({
        tooltip: '相機跟隨的平滑度（0-1，越小越平滑）',
        range: [0, 1, 0.01]
    })
    public smoothFactor: number = 0.1;
    
    @property({
        tooltip: '是否啟用相機邊界限制'
    })
    public enableBoundary: boolean = true;
    
    @property({
        tooltip: '相機左邊界',
        visible: function(this: CameraController) { return this.enableBoundary; }
    })
    public leftBoundary: number = -960;
    
    @property({
        tooltip: '相機右邊界',
        visible: function(this: CameraController) { return this.enableBoundary; }
    })
    public rightBoundary: number = 5000;
    
    @property({
        tooltip: '相機下邊界',
        visible: function(this: CameraController) { return this.enableBoundary; }
    })
    public bottomBoundary: number = -320;
    
    @property({
        tooltip: '相機上邊界',
        visible: function(this: CameraController) { return this.enableBoundary; }
    })
    public topBoundary: number = 1000;
    
    // 確保相機組件存在
    onLoad() {
        // 檢查相機組件
        const camera = this.getComponent(cc.Camera);
        if (!camera) {
            const newCamera = this.addComponent(cc.Camera);
            newCamera.cullingMask = 0xffffffff; // 顯示所有圖層
        }
    }

    update(dt: number) {
        if (!this.target) {
            return;
        }
        
        // 計算目標位置（加上偏移量）
        const targetPosition = this.target.position;
        const targetX = targetPosition.x + this.offset.x;
        const targetY = targetPosition.y + this.offset.y;
        
        // 當前相機位置
        const currentPosition = this.node.position;
        
        // 使用平滑插值計算新位置
        let newX = cc.misc.lerp(currentPosition.x, targetX, this.smoothFactor);
        let newY = cc.misc.lerp(currentPosition.y, targetY, this.smoothFactor);
        
        // 邊界限制
        if (this.enableBoundary) {
            newX = cc.misc.clampf(newX, this.leftBoundary, this.rightBoundary);
            newY = cc.misc.clampf(newY, this.bottomBoundary, this.topBoundary);
        }
        
        // 更新相機位置
        this.node.position = cc.v3(newX, newY, currentPosition.z);
    }
    
    /**
     * 設置相機跟隨的目標
     * @param target 目標節點
     * @param offset 可選的偏移量
     */
    public setTarget(target: cc.Node, offset?: cc.Vec2) {
        this.target = target;
        if (offset) {
            this.offset = offset;
        }
    }
    
    /**
     * 設置相機邊界
     * @param left 左邊界
     * @param right 右邊界
     * @param bottom 下邊界
     * @param top 上邊界
     */
    public setBoundary(left: number, right: number, bottom: number, top: number) {
        this.leftBoundary = left;
        this.rightBoundary = right;
        this.bottomBoundary = bottom;
        this.topBoundary = top;
        this.enableBoundary = true;
    }
    
    /**
     * 立即將相機移動到目標位置（不使用平滑過渡）
     */
    public jumpToTarget() {
        if (this.target) {
            const targetPosition = this.target.position;
            let posX = targetPosition.x + this.offset.x;
            let posY = targetPosition.y + this.offset.y;
            
            if (this.enableBoundary) {
                posX = cc.misc.clampf(posX, this.leftBoundary, this.rightBoundary);
                posY = cc.misc.clampf(posY, this.bottomBoundary, this.topBoundary);
            }
            
            this.node.position = cc.v3(posX, posY, this.node.position.z);
        }
    }
}
