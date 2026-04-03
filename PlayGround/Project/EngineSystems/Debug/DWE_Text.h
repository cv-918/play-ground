#pragma once
#include "DebugWindowElement.h"

class DWE_Text final : public DebugWindowElement
{
public:
	explicit DWE_Text(const DweTextData& _data)
		: DebugWindowElement(DebugWindowElementType::Text), data_(_data)
	{
	}

	~DWE_Text() override DEFAULT;

public:
	_Vector2 Measure() const override;
	void Render(_double _delta_time) override;

private:
	DweTextData data_;
};