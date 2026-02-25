#pragma once

#include "Actors/GameObjectBase.h"

class Background : public GameObjectBase
{
public:
	explicit Background() : nav_mesh_draw_rt_{} {};
	virtual ~Background() DEFAULT;

public:
    virtual _bool Initialize() override;
    virtual _int Update(double _delta_time) override;
	virtual void Render(double _delta_time) override;

public:
	const _Rect& NavMesh() const { return nav_mesh_; }

private:
	_Rect nav_mesh_;
	RECT nav_mesh_draw_rt_; // ToRect 로는 FillRect() 에 넘겨줄 수가 없어서 미리 변환해둠
};
