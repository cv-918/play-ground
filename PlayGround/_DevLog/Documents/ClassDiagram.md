classDiagram
    GameObjectBase <|-- Bullet
    ICollidable <|.. Bullet
    
    class GameObjectBase {
        +Transform* transform_
        +Initialize()
        +Update()
        +Render()
    }
    
    class Bullet {
        -float damage_
        -float speed_
        -Unit* owner_
        -SphereCollider* collider_
        +SetOwner(Unit*)
        +OnCollisionEnter()
    }