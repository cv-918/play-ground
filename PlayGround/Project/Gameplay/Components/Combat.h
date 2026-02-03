#pragma once
#include "Component.h"

class Combat : public Component
{
public:
	explicit Combat()
		: Component(ComponentType::Combat)
		, hp_(0)
	{}

public:
	_int HP() const { return hp_; }
	void HP(const _int _hp) { hp_ = _hp; }

	_int Att() const { return att_; }
	void Att(const _int _att) { att_ = _att; }

private:
	_int hp_;
	_int att_;
};
