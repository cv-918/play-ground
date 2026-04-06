#include "framework.h"
#include "GraphicResourceManager.h"

// GDI+ 관련 생성 오류가 발생하는 파일에서만 매크로를 잠시 끕니다.
#ifdef _DEBUG
#undef new
#endif

// 색상 값을 키로 변환 (ARGB 이용)
_uint GetColorKey(_Color _color) { return _color.GetValue(); }

GraphicResourceManager::~GraphicResourceManager()
{
	Release();
}

Gdiplus::SolidBrush* GraphicResourceManager::GetBrush(_Color _color)
{
	const auto key = GetColorKey(_color);
	if (brushes_.find(key) == brushes_.end())
	{
		brushes_[key] = new Gdiplus::SolidBrush(_color);
	}
	return brushes_[key];
}

Gdiplus::SolidBrush* GraphicResourceManager::GetBrush(_Color _color, _byte _alpha)
{
	// 알파값이 적용된 새로운 색상 생성
	_Color alphaColor(_alpha, _color.GetR(), _color.GetG(), _color.GetB());

	// 이미 만들어둔 GetBrush(Color)를 재호출하여 캐싱 이득을 봄
	return GetBrush(alphaColor);
}

Gdiplus::Pen* GraphicResourceManager::GetPen(_Color _color, _float _thickness)
{
	// 키 생성: 색상과 두께를 조합하여 고유한 키 생성 (색상(32bit)을 상위 비트로, 두께(32bit)를 하위 비트로 밀어서 64bit 키 생성)
	const auto thickness_key = s_cast(_ulonglong, _thickness * 100.0f);
	const auto key = (s_cast(_ulonglong, _color.GetValue()) << 32) | thickness_key;
	if (pens_.find(key) == pens_.end())
	{
		pens_[key] = new Gdiplus::Pen(_color, _thickness);
	}
	return pens_[key];
}

Gdiplus::Pen* GraphicResourceManager::GetPen(_Color _color, _byte _alpha, _float _thickness)
{
	// 알파값이 적용된 새로운 색상 생성
	_Color alphaColor(_alpha, _color.GetR(), _color.GetG(), _color.GetB());

	// 이미 만들어둔 GetPen(Color, Thickness)를 재호출하여 캐싱 이득을 봄
	return GetPen(alphaColor, _thickness);
}

Gdiplus::Font* GraphicResourceManager::GetFont(_float _size, _int _style)
{
	// 1. 크기를 소수점 둘째 자리까지 정수화 (예: 12.5f -> 1250)
	// 24비트면 약 16만까지 표현 가능하므로 폰트 사이즈로는 충분합니다.
	const auto size_key = s_cast(_ulonglong, _size * 100.0f);

	// 2. 키 조합: 상위 비트에 스타일, 하위 비트에 사이즈 배치
	// [ Style (8bit) ][ Size*100 (24bit) ]
	const auto key = (s_cast(_ulonglong, _style & 0xFF) << 24) | (size_key & 0xFFFFFF);

	auto it = fonts_.find(key);
	if (it != fonts_.end()) return it->second;

	// 3. 고정된 폰트 패밀리 사용 (예: D2Coding)
	static Gdiplus::FontFamily fixedFamily(L"D2Coding");

	// 신규 생성
	const auto new_font = new Gdiplus::Font(&fixedFamily, _size, _style, Gdiplus::UnitPixel);
	fonts_[key] = new_font;

	return new_font;
}

Gdiplus::Image* GraphicResourceManager::GetTexture(const std::wstring& _path)
{
	auto it = textures_.find(_path);
	if (it != textures_.end())
		return it->second;

	// Bitmap으로 로드해야 LockBits 기반 픽셀 분석이 가능합니다.
	auto new_img = Gdiplus::Bitmap::FromFile(_path.c_str(), FALSE);
	if (!new_img || new_img->GetLastStatus() != Gdiplus::Ok)
	{
		SAFE_DELETE(new_img);
		return nullptr;
	}

	textures_[_path] = new_img;
	return new_img;
}

const SpriteResource* GraphicResourceManager::GetSprite(
	const std::wstring& _path,
	SpritePivotMode _pivot_mode,
	_byte _alpha_threshold)
{
	const auto sprite_key = _BuildSpriteKey(_path, _pivot_mode, _alpha_threshold);

	auto it = sprites_.find(sprite_key);
	if (it != sprites_.end())
		return &it->second;

	auto* image = GetTexture(_path);
	if (!image)
		return nullptr;

	Gdiplus::Unit unit = Gdiplus::UnitPixel;
	Gdiplus::RectF rect{};
	if (image->GetBounds(&rect, &unit) != Gdiplus::Ok)
		return nullptr;

	auto* bitmap = dynamic_cast<Gdiplus::Bitmap*>(image);
	if (!bitmap)
		return nullptr;

	SpriteResource sprite;
	sprite.image = image;
	sprite.image_rect = rect;
	sprite.visible_bounds = _CalculateVisibleBounds(bitmap, _alpha_threshold);
	sprite.pivot_mode = _pivot_mode;
	sprite.pivot = _CalculatePivot(sprite.visible_bounds, _pivot_mode);

	const auto result = sprites_.insert({ sprite_key, sprite });
	return &result.first->second;
}

void GraphicResourceManager::SetSpriteCustomPivot(const std::wstring& _path, const Gdiplus::PointF& _pivot)
{
	const auto sprite_key = _BuildSpriteKey(_path, SpritePivotMode::Custom, 8);

	auto it = sprites_.find(sprite_key);
	if (it == sprites_.end())
	{
		auto* image = GetTexture(_path);
		if (!image)
			return;

		Gdiplus::Unit unit = Gdiplus::UnitPixel;
		Gdiplus::RectF rect{};
		if (image->GetBounds(&rect, &unit) != Gdiplus::Ok)
			return;

		auto* bitmap = dynamic_cast<Gdiplus::Bitmap*>(image);
		if (!bitmap)
			return;

		SpriteResource sprite;
		sprite.image = image;
		sprite.image_rect = rect;
		sprite.visible_bounds = _CalculateVisibleBounds(bitmap, 8);
		sprite.pivot_mode = SpritePivotMode::Custom;
		sprite.pivot = _pivot;

		sprites_.insert({ sprite_key, sprite });
		return;
	}

	it->second.pivot_mode = SpritePivotMode::Custom;
	it->second.pivot = _pivot;
}

VisibleBounds GraphicResourceManager::_CalculateVisibleBounds(Gdiplus::Bitmap* _bitmap, _byte _alpha_threshold)
{
	VisibleBounds bounds{};

	if (!_bitmap)
		return bounds;

	const auto width = _bitmap->GetWidth();
	const auto height = _bitmap->GetHeight();

	if (0 == width || 0 == height)
		return bounds;

	Gdiplus::Rect lock_rect(0, 0, width, height);
	Gdiplus::BitmapData bitmap_data{};

	const auto lock_result = _bitmap->LockBits(
		&lock_rect,
		Gdiplus::ImageLockModeRead,
		PixelFormat32bppARGB,
		&bitmap_data
	);

	if (lock_result != Gdiplus::Ok)
	{
		bounds.min_x = 0;
		bounds.min_y = 0;
		bounds.max_x = s_int(width) - 1;
		bounds.max_y = s_int(height) - 1;
		return bounds;
	}

	_bool found = false;
	_int min_x = s_int(width);
	_int min_y = s_int(height);
	_int max_x = -1;
	_int max_y = -1;

	const auto stride = bitmap_data.Stride;
	auto* scan0 = s_cast(_byte*, bitmap_data.Scan0);

	for (_int y = 0; y < s_int(height); ++y)
	{
		auto* row = scan0 + y * stride;
		for (_int x = 0; x < s_int(width); ++x)
		{
			// PixelFormat32bppARGB의 메모리 배치는 일반적으로 BGRA입니다.
			const auto alpha = row[x * 4 + 3];
			if (alpha <= _alpha_threshold)
				continue;

			found = true;

			if (x < min_x) min_x = x;
			if (y < min_y) min_y = y;
			if (x > max_x) max_x = x;
			if (y > max_y) max_y = y;
		}
	}

	_bitmap->UnlockBits(&bitmap_data);

	if (!found)
	{
		bounds.min_x = 0;
		bounds.min_y = 0;
		bounds.max_x = s_int(width) - 1;
		bounds.max_y = s_int(height) - 1;
		return bounds;
	}

	bounds.min_x = min_x;
	bounds.min_y = min_y;
	bounds.max_x = max_x;
	bounds.max_y = max_y;

	return bounds;
}

Gdiplus::PointF GraphicResourceManager::_CalculatePivot(const VisibleBounds& _visible_bounds, SpritePivotMode _pivot_mode)
{
	switch (_pivot_mode)
	{
	case SpritePivotMode::Center:
		return Gdiplus::PointF(_visible_bounds.CenterX(), _visible_bounds.CenterY());

	case SpritePivotMode::BottomCenter:
		return Gdiplus::PointF(_visible_bounds.CenterX(), s_cast(_float, _visible_bounds.max_y));

	case SpritePivotMode::Custom:
		break;
	}

	return Gdiplus::PointF(_visible_bounds.CenterX(), _visible_bounds.CenterY());
}

std::wstring GraphicResourceManager::_BuildSpriteKey(
	const std::wstring& _path,
	SpritePivotMode _pivot_mode,
	_byte _alpha_threshold) const
{
	return _path +
		L"#pm=" + std::to_wstring(s_int(_pivot_mode)) +
		L"#at=" + std::to_wstring(_alpha_threshold);
}

Gdiplus::TextureBrush* GraphicResourceManager::GetTextureBrush(const std::wstring& _path, Gdiplus::WrapMode _wrap_mode)
{
	// 1. 경로 해시와 WrapMode 조합으로 고유 키 생성
	size_t path_hash = std::hash<std::wstring>{}(_path);
	_ulonglong key = (s_cast(_ulonglong, path_hash) << 8) | (s_cast(_ulonglong, _wrap_mode));

	if (tex_brushes_.find(key) != tex_brushes_.end())
		return tex_brushes_[key];

	const auto img = GetTexture(_path);
	if (!img) return nullptr;

	// 2. WrapMode를 적용하여 브러시 생성
	const auto new_tex_brush = new Gdiplus::TextureBrush(img, _wrap_mode);
	tex_brushes_[key] = new_tex_brush;
	return new_tex_brush;
}

Gdiplus::TextureBrush* GraphicResourceManager::GetTextureBrush(_ulonglong _key)
{
	return tex_brushes_[_key];
}

Gdiplus::StringFormat* GraphicResourceManager::GetStringFormat(_bool _is_center)
{
	if (_is_center)
	{
		if (!format_center_)
		{
			format_center_ = new Gdiplus::StringFormat();
			format_center_->SetAlignment(Gdiplus::StringAlignmentCenter);
			format_center_->SetLineAlignment(Gdiplus::StringAlignmentCenter);
		}
		return format_center_;
	}

	if (!format_left_)
	{
		format_left_ = new Gdiplus::StringFormat();
		format_left_->SetAlignment(Gdiplus::StringAlignmentNear);
		format_left_->SetLineAlignment(Gdiplus::StringAlignmentNear);
	}
	return format_left_;
}

void GraphicResourceManager::Release()
{
	for (auto& pair : brushes_) SAFE_DELETE(pair.second);
	for (auto& pair : pens_) SAFE_DELETE(pair.second);
	for (auto& pair : fonts_) SAFE_DELETE(pair.second);
	for (auto& pair : textures_) SAFE_DELETE(pair.second);
	for (auto& pair : tex_brushes_) SAFE_DELETE(pair.second);

	brushes_.clear();
	pens_.clear();
	fonts_.clear();
	textures_.clear();
	sprites_.clear();
	tex_brushes_.clear();

	SAFE_DELETE(format_center_);
	SAFE_DELETE(format_left_);
}