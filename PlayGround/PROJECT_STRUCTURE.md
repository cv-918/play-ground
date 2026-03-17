# Project Structure (Updated: 2026-03-17 09:57)

```text
Root
+--- Data
+--- html
|   +--- search
+--- Project
|   +--- App
|   |   |   EntryPoint.cpp
|   |   |   EntryPoint.h
|   |   |   PlayGround.cpp
|   |   |   PlayGround.h
|   +--- Core
|   |   +--- Base
|   |   |   |   Bases.h
|   |   |   |   Defines.h
|   |   |   |   DrawFunctions.cpp
|   |   |   |   DrawFunctions.h
|   |   |   |   Extern.h
|   |   |   |   UtilityFunctions.h
|   |   +--- Interface
|   |   |   |   Interfaces.h
|   |   +--- Math
|   |   |   |   Geometry2D.cpp
|   |   |   |   Geometry2D.h
|   |   |   |   MathFunctions.h
|   |   |   |   Random.cpp
|   |   |   |   Random.h
|   |   |   |   Vector3.h
|   +--- EngineSystems
|   |   +--- Input
|   |   |   |   InputManager.cpp
|   |   |   |   InputManager.h
|   |   +--- Json
|   |   |   |   JsonDataManager.cpp
|   |   |   |   JsonDataManager.h
|   |   +--- Physics
|   |   |   |   CollisionManager.cpp
|   |   |   |   CollisionManager.h
|   |   +--- Render
|   |   |   |   RenderChain.cpp
|   |   |   |   RenderChain.h
|   |   +--- Timer
|   |   |   |   Timer.cpp
|   |   |   |   Timer.h
|   +--- Framework
|   |   |   framework.h
|   |   |   pch.cpp
|   |   |   PlayGround.rc
|   |   |   Resource.h
|   |   |   targetver.h
|   +--- Gameplay
|   |   +--- Actors
|   |   |   +--- Projectile
|   |   |   |   |   Bullet.cpp
|   |   |   |   |   Bullet.h
|   |   |   |   Enemy.cpp
|   |   |   |   Enemy.h
|   |   |   |   ExpDust.cpp
|   |   |   |   ExpDust.h
|   |   |   |   Player.cpp
|   |   |   |   Player.h
|   |   |   |   UnitBase.cpp
|   |   |   |   UnitBase.h
|   |   +--- Common
|   |   |   |   CommonGamePlayDefine.h
|   |   |   |   CommonGamePlayType.h
|   |   +--- Components
|   |   |   |   Collider.cpp
|   |   |   |   Collider.h
|   |   |   |   Combat.cpp
|   |   |   |   Combat.h
|   |   |   |   ComponentBase.cpp
|   |   |   |   ComponentBase.h
|   |   |   |   Movement.cpp
|   |   |   |   Movement.h
|   |   |   |   NonPlayableMovement.cpp
|   |   |   |   NonPlayableMovement.h
|   |   |   |   PlayableMovement.cpp
|   |   |   |   PlayableMovement.h
|   |   |   |   RectCollider.cpp
|   |   |   |   RectCollider.h
|   |   |   |   SphereCollider.cpp
|   |   |   |   SphereCollider.h
|   |   |   |   Status.cpp
|   |   |   |   Status.h
|   |   |   |   Transform.cpp
|   |   |   |   Transform.h
|   |   +--- GamePlaySystems
|   |   |   +--- Json
|   |   |   |   |   AttributeNodeDataManager.cpp
|   |   |   |   |   AttributeNodeDataManager.h
|   |   |   |   |   EnemyDataManager.cpp
|   |   |   |   |   EnemyDataManager.h
|   |   |   |   |   PlayableCharacterDataManager.cpp
|   |   |   |   |   PlayableCharacterDataManager.h
|   |   |   |   |   UserDataManager.cpp
|   |   |   |   |   UserDataManager.h
|   |   |   |   GameState.cpp
|   |   |   |   GameState.h
|   |   |   |   SceneManager.cpp
|   |   |   |   SceneManager.h
|   |   |   |   StageManager.cpp
|   |   |   |   StageManager.h
|   |   |   |   UIManager.cpp
|   |   |   |   UIManager.h
|   |   |   |   UserProfile.cpp
|   |   |   |   UserProfile.h
|   |   +--- Scenes
|   |   |   |   InGameScene.cpp
|   |   |   |   InGameScene.h
|   |   |   |   IntroScene.cpp
|   |   |   |   IntroScene.h
|   |   |   |   LoadingScene.cpp
|   |   |   |   LoadingScene.h
|   |   |   |   OutGameScene.cpp
|   |   |   |   OutGameScene.h
|   |   |   |   Scene.cpp
|   |   |   |   Scene.h
|   |   +--- UI
|   |   |   +--- Elements
|   |   |   |   |   Button.cpp
|   |   |   |   |   Button.h
|   |   |   |   |   Grid.cpp
|   |   |   |   |   Grid.h
|   |   |   |   |   ProgressBar.cpp
|   |   |   |   |   ProgressBar.h
|   |   |   |   |   Text.cpp
|   |   |   |   |   Text.h
|   |   |   +--- Views
|   |   |   |   |   OutGameAttributeView.cpp
|   |   |   |   |   OutGameAttributeView.h
|   |   |   |   |   OutGameMainView.cpp
|   |   |   |   |   OutGameMainView.h
|   |   |   +--- Widgets
|   |   |   |   |   AttributeNode.cpp
|   |   |   |   |   AttributeNode.h
|   |   |   |   |   AttributeNodeToolTip.cpp
|   |   |   |   |   AttributeNodeToolTip.h
|   |   |   |   |   AttributeNodeTree.cpp
|   |   |   |   |   AttributeNodeTree.h
|   |   |   |   |   DamageFont.cpp
|   |   |   |   |   DamageFont.h
|   |   |   |   |   HpBar.cpp
|   |   |   |   |   HpBar.h
|   |   |   |   |   WidgetBase.cpp
|   |   |   |   |   WidgetBase.h
|   |   |   |   UIBase.cpp
|   |   |   |   UIBase.h
|   |   +--- World
|   |   |   |   Background.cpp
|   |   |   |   Background.h
|   |   |   |   NavMesh.cpp
|   |   |   |   NavMesh.h
+--- _DevLog
|   +--- Documents
|   +--- Idea
|   +--- Minutes
+--- _Intermediate
|   PlayGround.ico
|   PlayGround.sln
|   PlayGround.vcxproj
|   small.ico
```
