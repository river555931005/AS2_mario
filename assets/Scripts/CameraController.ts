const { ccclass, property } = cc._decorator;

@ccclass
export default class CameraController extends cc.Component {
    @property(cc.Node)
    public target: cc.Node = null; // 玩家節點

    @property(cc.Vec2)
    public offset: cc.Vec2 = cc.v2(0, 0); // 攝影機偏移量

    update(dt: number) {
        if (this.target) {
            // 攝影機跟隨玩家
            const targetPosition = this.target.position;
            this.node.position = cc.v3(
                targetPosition.x + this.offset.x,
                targetPosition.y + this.offset.y,
                targetPosition.z || 0
            );
        }
    }
}
