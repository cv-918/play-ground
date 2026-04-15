#pragma once

#include "Actors/GameObjectBase.h"

class Background : public GameObjectBase
{
public:
	struct CreateInfo
	{
		std::wstring background_path_;
		_Point nav_mesh_center_ = GAME_VIEW_CENTER;
		_Size nav_mesh_size_ = _Size(800, 600);
		_RectF render_dest_rect_ = _RectF(0.f, 0.f, static_cast<_float>(GAME_VIEW_WIDTH), static_cast<_float>(GAME_VIEW_HEIGHT));
	};

public:
	explicit Background(const CreateInfo& _create_info = {});

public:
	_bool Initialize() override;
	void Render(_double _delta_time) override;
	void DebugRender() override;

public:
	const _Rect& NavMesh() const { return nav_mesh_; }
	void UpdateViewport(const _Size& _size);

private:
	CreateInfo create_info_;
	_Rect nav_mesh_;
	const SpriteResource* background_sprite_ = nullptr;
};
