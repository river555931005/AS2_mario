/**
 * 物品控制器
 * 負責遊戲中各種物品的行為
 */

import { PlayerState } from './Player';

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

    // 星星特殊跳躍設定
    @property(cc.Float)
    public starJumpForce: number = 400;
    
    @property(cc.Float)
    public starJumpInterval: number = 1.0;

    // 私有屬性
    private rigidBody: cc.RigidBody = null;
    private isActive: boolean = false;
    private direction: number = 1; // 1=右，-1=左
    private velocity: cc.Vec2 = cc.v2(0, 0);
    private jumpTimer: number = 0;

    onLoad() {
        // 獲取或添加剛體組件（對於需要物理行為的物品）
        this.rigidBody = this.getComponent(cc.RigidBody);
        if (this.type === ItemType.MUSHROOM || this.type === ItemType.STAR) {
            if (!this.rigidBody) {
                this.rigidBody = this.addComponent(cc.RigidBody);
                this.rigidBody.type = cc.RigidBodyType.Dynamic;
                this.rigidBody.allowSleep = false;
                this.rigidBody.gravityScale = 1;
                this.rigidBody.linearDamping = 0;
                this.rigidBody.fixedRotation = true;
            }
        }

        // 設置碰撞邊界
        let collider = this.getComponent(cc.PhysicsBoxCollider);
        if (!collider) {
            collider = this.addComponent(cc.PhysicsBoxCollider);
            collider.size = cc.size(32, 32);
            collider.offset = cc.v2(0, 0);
            collider.sensor = true; // 物品默認為感應器
        }
        
        // 設置分組
        this.node.group = 'item';

        // 如果是硬幣，直接設為活躍
        if (this.type === ItemType.COIN) {
            this.isActive = true;
        }
    }

    update(dt) {
        if (!this.isActive) {
            return;
        }

        // 處理蘑菇的移動
        if (this.type === ItemType.MUSHROOM) {
            // 應用重力
            this.velocity.y += this.gravity * dt;
            // 水平移動
            this.velocity.x = this.moveSpeed * this.direction;
            
            // 應用速度到剛體
            if (this.rigidBody) {
                this.rigidBody.linearVelocity = this.velocity;
            }
        }
        // 處理星星的特殊跳躍行為
        else if (this.type === ItemType.STAR) {
            // 水平移動
            this.velocity.x = this.moveSpeed * this.direction;
            
            // 跳躍計時
            this.jumpTimer -= dt;
            if (this.jumpTimer <= 0 && this.isGrounded()) {
                // 執行跳躍
                this.velocity.y = this.starJumpForce;
                this.jumpTimer = this.starJumpInterval;
            } else {
                // 應用重力
                this.velocity.y += this.gravity * dt;
            }
            
            // 應用速度到剛體
            if (this.rigidBody) {
                this.rigidBody.linearVelocity = this.velocity;
            }
        }

        // 邊界檢查
        this.checkBounds();
    }

    // 檢查是否在地面上
    private isGrounded(): boolean {
        // 使用射線檢測從物品底部向下檢查
        const start = this.node.convertToWorldSpaceAR(cc.v2(0, -this.node.height / 2));
        const end = start.add(cc.v2(0, -5));
        
        const results = cc.director.getPhysicsManager().rayCast(start, end, cc.RayCastType.All);
        
        return results.some(result => 
            result.collider.node !== this.node && 
            (result.collider.node.group === 'ground' || result.collider.node.group === 'brick')
        );
    }

    // 激活物品
    public activate() {
        this.isActive = true;

        if (this.type === ItemType.MUSHROOM || this.type === ItemType.STAR) {
            // 物品需要物理互動，取消傳感器屬性
            const collider = this.getComponent(cc.PhysicsBoxCollider);
            if (collider) {
                collider.sensor = false;
            }

            // 設置初始速度
            this.velocity.x = this.moveSpeed * this.direction;
            
            // 星星應該立即跳躍
            if (this.type === ItemType.STAR) {
                this.velocity.y = this.starJumpForce;
                this.jumpTimer = this.starJumpInterval;
            }
        }
    }

    // 改進物品的碰撞邏輯
    onBeginContact(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, otherCollider: cc.PhysicsCollider) {
        if (!this.isActive) {
            return;
        }

        const otherNode = otherCollider.node;
        const worldManifold = contact.getWorldManifold();
        const normal = worldManifold.normal;

        // 被玩家收集
        if (otherNode.group === 'player') {
            const player = otherNode.getComponent('Player');
            if (player) {
                this.collect(player);
            }
        } 
        // 碰到障礙物，改變方向
        else if ((this.type === ItemType.MUSHROOM || this.type === ItemType.STAR) && 
                 (otherNode.group === 'ground' || otherNode.group === 'brick' || 
                  otherNode.group === 'pipe')) {
            
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
        
        // 檢查是否超出螢幕左右邊界
        const halfWidth = gameView.width / 2;
        if (Math.abs(this.node.x) > halfWidth + 200) {
            this.node.destroy();
        }
    }

    // 被收集，添加類型註解
    public collect(player: any) {
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
                    player.setState(PlayerState.INVINCIBLE);
                }
                break;

            case ItemType.FLOWER:
                // 讓玩家獲得火力
                if (player) {
                    player.setState(PlayerState.FIRE);
                }
                break;
        }

        // 移除物品
        this.node.destroy();
    }
}
