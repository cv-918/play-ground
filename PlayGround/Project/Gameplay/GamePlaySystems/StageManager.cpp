#include "framework.h"
#include "StageManager.h"

_int StageManager::Update(_double _delta_time)
{
    return _int();
}

_int StageManager::LateUpdate(_double _delta_time)
{
    return _int();
}

void StageManager::Render(_double _delta_time)
{
}

void StageManager::SetNavMesh(const _Rect& _rt)
{
    stage_nav_mesh_ = &_rt;
    _UpdateGenerationAreas();
}

_Point StageManager::GeneratePosition(_bool _inclusive)
{
	std::vector<_Rect> areas = { generation_area_[0], generation_area_[0], generation_area_[0], generation_area_[0] };
	_uint area_index_max = 3;

	if (_inclusive)
	{
		areas.insert(areas.begin(), *stage_nav_mesh_);
		area_index_max = 4;
	}
	
	// 임의의 생성 구역을 선택
	const auto area_index = _Random.Range(0, area_index_max);

	// 생성 구역 안의 임의의 좌표를 반환
	return {
		_Random.Range(generation_area_[area_index].Left(), generation_area_[area_index].Right()),
		_Random.Range(generation_area_[area_index].Top(), generation_area_[area_index].Bottom())
	};;
}

void StageManager::_UpdateGenerationAreas()
{
    if (nullptr == stage_nav_mesh_)
        return;

	_int stage_width = stage_nav_mesh_->Width();
	_int stage_height = stage_nav_mesh_->Height();

    _int padding_x = stage_width * 0.25f;
    _int padding_y = stage_height * 0.175f;

    // left
    generation_area_[0] = _Rect(
        _Point(-padding_x, -padding_y),
        _Point(0, stage_height + padding_y)
    );

	// top
	generation_area_[1] = _Rect(
		_Point(-padding_x, -padding_y),
		_Point(stage_width + padding_x, 0)
	);

	// right
	generation_area_[2] = _Rect(
		_Point(stage_width, -padding_y),
		_Point(stage_width + padding_x, stage_height + padding_y)
	);

	// bottom
	generation_area_[3] = _Rect(
		_Point(-padding_x, stage_height),
		_Point(stage_width + padding_x, stage_height + padding_y)
	);
}
