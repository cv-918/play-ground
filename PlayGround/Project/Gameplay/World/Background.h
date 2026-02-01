#pragma once

#include "Actors/GameObject.h"

class Background :
    public GameObject
{
public:
    explicit Background() DEFAULT;
	virtual ~Background() DEFAULT;

public:
    virtual _bool Initialize() override;
    virtual _int Update(double _delta_time) override;
	virtual void Render(double _delta_time) override;

public:
	const _Rect& BackgroundRect() const { return background_rect_; }

private:
	_Rect background_rect_ = {};
	RECT background_rt_ = {}; // ToRect 로는 background_rt_ 못 넘겨줘서 미리 변환해둠
};

