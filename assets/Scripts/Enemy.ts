/**
 * 敵人控制器
 * 負責敵人的行為、動畫和物理碰撞
 */

import { PlayerState } from './Player';

const {ccclass, property} = cc._decorator;

export enum EnemyType {
    GOOMBA,
    TURTLE,
    FLOWER
}

@ccclass
export default class Enemy extends cc.Component {
    
    // 敵人屬性
    @property({
        type: cc.Enum(EnemyType),
    })
    public type: EnemyType = EnemyType.GOOMBA;
    
    @property(cc.Float)
    public moveSpeed: number = 100;
    
    @property(cc.Float)
    public gravity: number = -1000;
    
    // 烏龜殼速度
    @property(cc.Float)
    public shellSpeed: number = 500;
    
    // 動畫相關
    @property(cc.Animation)
    private anim: cc.Animation = null;
    
    // 動畫幀資源 - Goomba
    @property({
        type: [cc.SpriteFrame],
        tooltip: '蘑菇敵人行走動畫幀',
        visible: function(this: Enemy) { return this.type === EnemyType.GOOMBA; }
    })
    private goombaWalkFrames: cc.SpriteFrame[] = [];
    
    @property({
        type: [cc.SpriteFrame],
        tooltip: '蘑菇敵人死亡動畫幀',
        visible: function(this: Enemy) { return this.type === EnemyType.GOOMBA; }
    })
    private goombaDieFrames: cc.SpriteFrame[] = [];
    
    // 動畫幀資源 - Turtle
    @property({
        type: [cc.SpriteFrame],
        tooltip: '烏龜行走動畫幀',
        visible: function(this: Enemy) { return this.type === EnemyType.TURTLE; }
    })
    private turtleWalkFrames: cc.SpriteFrame[] = [];
    
    @property({
        type: [cc.SpriteFrame],
        tooltip: '烏龜殼動畫幀',
        visible: function(this: Enemy) { return this.type === EnemyType.TURTLE; }
    })
    private turtleShellFrames: cc.SpriteFrame[] = [];
    
    // 動畫幀資源 - Flower
    @property({
        type: [cc.SpriteFrame],
        tooltip: '食人花攻擊動畫幀',
        visible: function(this: Enemy) { return this.type === EnemyType.FLOWER; }
    })
    private flowerAttackFrames: cc.SpriteFrame[] = [];
    
    @property({
        type: [cc.SpriteFrame],
        tooltip: '食人花死亡動畫幀',
        visible: function(this: Enemy) { return this.type === EnemyType.FLOWER; }
    })
    private flowerDieFrames: cc.SpriteFrame[] = [];
    
    // 音效
    @property(cc.AudioClip)
    private dieSound: cc.AudioClip = null;
    
    @property(cc.AudioClip)
    private kickSound: cc.AudioClip = null;
    
    // 私有屬性
    private rigidBody: cc.RigidBody = null;
    private isDead: boolean = false;
    private isTurnedOver: boolean = false;
    private isShellMoving: boolean = false;
    private direction: number = -1; // -1=左，1=右
    private velocity: cc.Vec2 = cc.v2(0, 0);
    private isGrounded: boolean = false;
    
    onLoad() {
        // 獲取組件
        this.rigidBody = this.getComponent(cc.RigidBody);
        if (!this.rigidBody) {
            this.rigidBody = this.addComponent(cc.RigidBody);
            this.rigidBody.type = cc.RigidBodyType.Dynamic;
            this.rigidBody.gravityScale = 1;
            this.rigidBody.fixedRotation = true;
        }
        
        // 設置碰撞邊界
        let collider = this.getComponent(cc.PhysicsBoxCollider);
        if (!collider) {
            collider = this.addComponent(cc.PhysicsBoxCollider);
            
            switch (this.type) {
                case EnemyType.GOOMBA:
                    collider.size = cc.size(32, 32);
                    break;
                case EnemyType.TURTLE:
                    collider.size = cc.size(32, 48);
                    break;
                case EnemyType.FLOWER:
                    collider.size = cc.size(32, 48);
                    break;
            }
            
            collider.offset = cc.v2(0, 0);
            collider.sensor = false;
        }
        
        // 設置分組
        this.node.group = 'enemy';
        
        // 初始化動畫
        this.initAnimations();
        
        // 設置起始方向和速度
        this.velocity.x = this.moveSpeed * this.direction;
    }
    
    start() {
        // 播放默認動畫
        this.updateAnimation();
    }
    
    update(dt) {
        // 如果死亡且不是翻倒的烏龜，不更新
        if (this.isDead && !(this.type === EnemyType.TURTLE && this.isTurnedOver)) {
            return;
        }
        
        // 應用重力
        this.velocity.y += this.gravity * dt;
        
        // 檢查地面
        this.checkGround();
        
        // 應用運動
        if (this.rigidBody) {
            this.rigidBody.linearVelocity = this.velocity;
        } else {
            this.node.x += this.velocity.x * dt;
            this.node.y += this.velocity.y * dt;
        }
        
        // 邊界檢查
        this.checkBounds();
    }
    
    // 修正動畫初始化問題
    private initAnimations() {
        if (!this.anim) {
            this.anim = this.getComponent(cc.Animation);
            if (!this.anim) {
                this.anim = this.addComponent(cc.Animation);
            }
        }
        
        // 清空現有動畫剪輯以避免重複
        this.anim.getClips().forEach(clip => {
            this.anim.removeClip(clip, true);
        });
        
        // 根據敵人類型創建對應的動畫
        switch (this.type) {
            case EnemyType.GOOMBA:
                this.createAnimationClip('goomba_walk', this.goombaWalkFrames, 0.2);
                this.createAnimationClip('goomba_die', this.goombaDieFrames, 0.5, cc.WrapMode.Normal);
                break;
                
            case EnemyType.TURTLE:
                this.createAnimationClip('turtle_walk', this.turtleWalkFrames, 0.2);
                this.createAnimationClip('turtle_die', this.turtleShellFrames, 0.5, cc.WrapMode.Normal);
                break;
                
            case EnemyType.FLOWER:
                this.createAnimationClip('flower_attack', this.flowerAttackFrames, 0.2);
                this.createAnimationClip('flower_die', this.flowerDieFrames, 0.5, cc.WrapMode.Normal);
                break;
        }
    }
    
    // 創建動畫剪輯
    private createAnimationClip(name: string, frames: cc.SpriteFrame[], duration: number, wrapMode: cc.WrapMode = cc.WrapMode.Loop) {
        if (!frames || frames.length === 0) {
            cc.warn(`無法創建 ${name} 動畫: 沒有提供精靈幀`);
            return;
        }
        
        const clip = new cc.AnimationClip();
        clip.name = name;
        clip.wrapMode = wrapMode;
        clip.duration = frames.length * duration;

        // 建立精靈幀曲線
        const keys = [];
        for (let i = 0; i < frames.length; i++) {
            keys.push({
                frame: i * duration / clip.duration,
                value: frames[i]
            });
        }
        clip.sample = 1 / duration;

        // 設置精靈幀動畫曲線
        (clip as any).curveData = {
            comps: {
                'cc.Sprite': {
                    'spriteFrame': keys
                }
            }
        };

        // 添加到動畫組件
        this.anim.addClip(clip);
    }
    
    // 更新動畫
    private updateAnimation() {
        if (!this.anim) return;
        
        if (this.isDead) {
            switch (this.type) {
                case EnemyType.GOOMBA:
                    this.anim.play('goomba_die');
                    break;
                case EnemyType.TURTLE:
                    if (this.isTurnedOver) {
                        this.anim.play('turtle_die');
                    }
                    break;
                case EnemyType.FLOWER:
                    this.anim.play('flower_die');
                    break;
            }
        } else {
            switch (this.type) {
                case EnemyType.GOOMBA:
                    this.anim.play('goomba_walk');
                    break;
                case EnemyType.TURTLE:
                    this.anim.play('turtle_walk');
                    break;
                case EnemyType.FLOWER:
                    this.anim.play('flower_attack');
                    break;
            }
        }
        
        // 更新朝向
        if (this.type !== EnemyType.FLOWER) {
            if (this.velocity.x > 0) {
                this.node.scaleX = 1;
            } else if (this.velocity.x < 0) {
                this.node.scaleX = -1;
            }
        }
    }
    
    // 地面檢查
    private checkGround() {
        // 使用射線檢測地面
        const start = this.node.convertToWorldSpaceAR(cc.Vec2.ZERO).add(cc.v2(0, -this.node.height / 2));
        const end = start.add(cc.v2(0, -5));
        
        const result = cc.director.getPhysicsManager().rayCast(start, end, cc.RayCastType.Closest);
        
        // 檢測是否有碰撞
        this.isGrounded = result.length > 0;
    }
    
    // 邊界檢查
    private checkBounds() {
        // 如果是食人花，不做邊界檢查
        if (this.type === EnemyType.FLOWER) {
            return;
        }
        
        const gameView = cc.find('Canvas');
        if (!gameView) return;
        
        // 檢查是否掉出螢幕底部
        if (this.node.y < -gameView.height / 2 - 100) {
            this.node.destroy();
        }
    }
    
    // 碰撞開始
    onBeginContact(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, otherCollider: cc.PhysicsCollider) {
        if (this.isDead && !(this.type === EnemyType.TURTLE && this.isTurnedOver)) return;

        const otherNode = otherCollider.node;
        
        // 確認碰撞的對象是否為玩家
        if (otherNode.group === 'player') {
            const player = otherNode.getComponent('Player');
            if (player) {
                // 獲取碰撞的世界坐標和法線
                const worldManifold = contact.getWorldManifold();
                const normal = worldManifold.normal;
                
                // 檢查是否從上方擊中敵人（法線向上）
                if (normal.y > 0.7 || player.getComponent(cc.RigidBody).linearVelocity.y < 0) {
                    // 玩家擊殺敵人
                    this.die();
                    
                    // 玩家反彈 - 給予向上的速度
                    const playerRB = player.getComponent(cc.RigidBody);
                    if (playerRB) {
                        playerRB.linearVelocity = cc.v2(playerRB.linearVelocity.x, 400);
                    }
                    
                    // 播放跳躍音效
                    const jumpSound = player.getComponent('Player').jumpSound;
                    if (jumpSound) {
                        cc.audioEngine.playEffect(jumpSound, false);
                    }
                } else if (this.type === EnemyType.TURTLE && this.isTurnedOver) {
                    // 烏龜殼被踢
                    this.kickShell(normal.x);
                } else {
                    // 玩家受傷
                    player.hurt();
                }
            }
        } else if (otherNode.group === 'ground' || otherNode.group === 'brick' || otherNode.group === 'pipe') {
            // 獲取碰撞法線
            const normal = contact.getWorldManifold().normal;
            
            // 如果是側面碰撞，改變方向
            if (Math.abs(normal.x) > 0.7) {
                this.direction *= -1;
                this.velocity.x = this.moveSpeed * this.direction;
                
                // 如果是移動中的烏龜殼，反彈速度更快
                if (this.type === EnemyType.TURTLE && this.isTurnedOver && this.isShellMoving) {
                    this.velocity.x = this.shellSpeed * this.direction;
                }
            }
        } else if (otherNode.group === 'enemy') {
            // 檢查是否是移動中的烏龜殼碰到其他敵人
            if (this.type === EnemyType.TURTLE && this.isTurnedOver && this.isShellMoving) {
                const enemy = otherNode.getComponent('Enemy');
                if (enemy && !enemy.isDead) {
                    enemy.die();
                    
                    // 增加額外分數
                    const gameManager = cc.find('GameManager')?.getComponent('GameManager');
                    if (gameManager) {
                        gameManager.addScore(200);
                    }
                }
            } else {
                // 普通敵人之間的碰撞，雙方改變方向
                this.direction *= -1;
                this.velocity.x = this.moveSpeed * this.direction;
            }
        }
    }
    
    // 踢烏龜殼
    private kickShell(normalX: number) {
        if (this.type !== EnemyType.TURTLE || !this.isTurnedOver) return;
        
        // 播放踢的音效
        if (this.kickSound) {
            cc.audioEngine.playEffect(this.kickSound, false);
        }
        
        // 決定踢的方向（根據碰撞法線的相反方向）
        let kickDirection = 1;
        if (normalX !== 0) {
            kickDirection = normalX > 0 ? -1 : 1;
        }
        
        // 設置烏龜殼速度
        this.isShellMoving = true;
        this.direction = kickDirection;
        this.velocity.x = this.shellSpeed * this.direction;
        
        // 增加分數
        const gameManager = cc.find('GameManager')?.getComponent('GameManager');
        if (gameManager) {
            gameManager.addScore(100);
        }
    }
    
    // 死亡
    public die() {
        if (this.isDead) return;
        
        this.isDead = true;
        
        // 播放死亡音效
        if (this.dieSound) {
            cc.audioEngine.playEffect(this.dieSound, false);
        }
        
        // 根據敵人類型不同的死亡處理
        switch (this.type) {
            case EnemyType.GOOMBA:
                // 扁平化並消失
                const collider = this.getComponent(cc.PhysicsBoxCollider);
                if (collider) {
                    collider.enabled = false;
                }
                
                // 改變外觀（讓它看起來扁平）
                this.node.scaleY = 0.5;
                
                // 更新動畫
                this.updateAnimation();
                
                // 延遲銷毀
                this.scheduleOnce(() => {
                    this.node.destroy();
                }, 0.5);
                break;
                
            case EnemyType.TURTLE:
                // 變成烏龜殼
                this.isTurnedOver = true;
                this.isShellMoving = false;
                this.velocity.x = 0;
                
                // 調整碰撞箱尺寸（變成較小的烏龜殼）
                const turtleCollider = this.getComponent(cc.PhysicsBoxCollider);
                if (turtleCollider) {
                    turtleCollider.size = cc.size(32, 32);
                }
                
                // 更新動畫
                this.updateAnimation();
                break;
                
            case EnemyType.FLOWER:
                // 食人花直接消失
                const flowerCollider = this.getComponent(cc.PhysicsBoxCollider);
                if (flowerCollider) {
                    flowerCollider.enabled = false;
                }
                
                // 更新動畫
                this.updateAnimation();
                
                // 延遲銷毀
                this.scheduleOnce(() => {
                    this.node.destroy();
                }, 0.5);
                break;
        }
        
        // 增加玩家分數
        const gameManager = cc.find('GameManager')?.getComponent('GameManager');
        if (gameManager) {
            gameManager.addScore(100);
        }
    }
    
    // 食人花特殊行為：上下移動
    private moveFlower(dt) {
        if (this.type !== EnemyType.FLOWER || this.isDead) return;
        
        // 食人花特有的上下移動行為
        // 這裡可以實現食人花的周期性上下移動
        // 例如使用正弦函數或計時器控制垂直位置
    }
}
