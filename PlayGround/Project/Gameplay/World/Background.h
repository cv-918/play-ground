#pragma once

#include "Actors/GameObjectBase.h"

class Background : public GameObjectBase
{
public:
    _bool Initialize() override;
	void Render(_double _delta_time) override;

public:
	const _Rect& NavMesh() const { return nav_mesh_; }

private:
	_Rect nav_mesh_;
};
