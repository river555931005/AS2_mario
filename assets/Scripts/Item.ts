/**
 * 物品控制器
 * 負責遊戲中各種物品的行為
 */

const {ccclass, property} = cc._decorator;

// 將 ItemType 定義移到類外部
export enum ItemType {
    COIN,
    MUSHROOM,
    STAR,
    FLOWER
}

@ccclass
export default class Item extends cc.Component {
    // 修正屬性定義
    @property({
        type: cc.Enum(ItemType)
    })
    public type: ItemType = ItemType.MUSHROOM;

    @property(cc.Float)
    public moveSpeed: number = 100;

    @property(cc.Float)
    public gravity: number = -1000;

    @property(cc.AudioClip)
    private collectSound: cc.AudioClip = null;

    // 私有屬性
    private rigidBody: cc.RigidBody = null;
    private isActive: boolean = false;
    private direction: number = 1; // 1=右，-1=左
    private velocity: cc.Vec2 = cc.v2(0, 0);

    onLoad() {
        // 獲取組件
        this.rigidBody = this.getComponent(cc.RigidBody);

        // 設置碰撞邊界
        let collider = this.getComponent(cc.PhysicsBoxCollider);
        if (!collider) {
            collider = this.addComponent(cc.PhysicsBoxCollider);
            collider.size = cc.size(32, 32);
            collider.offset = cc.v2(0, 0);
            collider.sensor = true; // 物品默認為感應器
            collider.tag = 2; // 標記為物品
        }

        // 如果是硬幣，直接設為活躍
        if (this.type === ItemType.COIN) {
            this.isActive = true;
        }
    }

    update(dt) {
        if (!this.isActive) {
            return;
        }

        // 只有蘑菇需要受重力和移動
        if (this.type === ItemType.MUSHROOM) {
            // 應用重力
            this.velocity.y += this.gravity * dt;

            // 水平移動
            this.velocity.x = this.moveSpeed * this.direction;

            // 應用速度
            if (this.rigidBody) {
                this.rigidBody.linearVelocity = this.velocity;
            } else {
                this.node.x += this.velocity.x * dt;
                this.node.y += this.velocity.y * dt;
            }
        }

        // 邊界檢查
        this.checkBounds();
    }

    // 激活物品
    public activate() {
        this.isActive = true;

        if (this.type === ItemType.MUSHROOM) {
            // 蘑菇需要移動
            const collider = this.getComponent(cc.PhysicsBoxCollider);
            if (collider) {
                collider.sensor = false;
            }

            // 設置初始速度
            this.velocity.x = this.moveSpeed * this.direction;
        } else if (this.type === ItemType.STAR) {
            // 星星也需要移動，但有特殊的跳躍行為
            const collider = this.getComponent(cc.PhysicsBoxCollider);
            if (collider) {
                collider.sensor = false;
            }

            // 設置初始速度
            this.velocity.x = this.moveSpeed * this.direction;
        }
    }

    // 修正物品的碰撞邏輯
    onBeginContact(contact, selfCollider, otherCollider) {
        if (!this.isActive) {
            return;
        }

        const otherNode = otherCollider.node;

        // 被玩家收集
        if (otherNode.group === 'player') {
            const player = otherNode.getComponent('Player');
            if (player) {
                this.collect(player);
            }
        } 
        // 碰到障礙物，改變方向
        else if (this.type === ItemType.MUSHROOM && otherNode.group === 'ground') {
            const normal = contact.getWorldManifold().normal;

            // 如果是側面碰撞，改變方向
            if (Math.abs(normal.x) > 0.7) {
                this.direction *= -1;
            }
        }
    }

    // 修正邊界檢查
    private checkBounds() {
        const gameView = cc.find('Canvas');
        if (!gameView) return;

        // 檢查是否掉出螢幕底部
        if (this.node.y < -gameView.height / 2 - 100) {
            this.node.destroy();
        }
    }

    // 被收集
    public collect(player) {
        // 播放收集音效
        if (this.collectSound) {
            cc.audioEngine.playEffect(this.collectSound, false);
        }

        // 根據物品類型不同的效果
        switch (this.type) {
            case ItemType.COIN:
                // 增加分數
                const gameManager = cc.find('GameManager').getComponent('GameManager');
                if (gameManager) {
                    gameManager.addScore(200);
                }
                break;

            case ItemType.MUSHROOM:
                // 讓玩家變大
                if (player) {
                    player.growBig();
                }
                break;

            case ItemType.STAR:
                // 讓玩家無敵
                if (player) {
                    player.setState(player.PlayerState.INVINCIBLE);
                }
                break;

            case ItemType.FLOWER:
                // 讓玩家獲得火力
                if (player) {
                    player.setState(player.PlayerState.FIRE);
                }
                break;
        }

        // 移除物品
        this.node.destroy();
    }
}
