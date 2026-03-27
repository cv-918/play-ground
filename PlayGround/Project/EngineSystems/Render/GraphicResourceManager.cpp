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

Gdiplus::Font* GraphicResourceManager::GetFont(const std::wstring& _family, _float _size, _int _style)
{
	// 키 생성: 폰트 패밀리, 크기, 스타일을 조합하여 고유한 키 생성 (예. "FamilyHash_Size_Style" 형태)
	// 1) 패밀리 이름을 해시값으로 변환 (std::hash 사용)
	size_t family_hash = std::hash<std::wstring>{}(_family);

	// 2) 크기와 스타일을 조합하여 키 생성 (크기는 소수점 둘째 자리까지 고려)
	const auto size_key = s_cast(_ulonglong, _size * 100.0f);

	// 3) 최종 키 생성: 패밀리 해시값과 크기, 스타일을 XOR 연산으로 조합하여 고유한 키 생성
	const auto key = family_hash ^ (size_key << 8) ^ (s_cast(_ulonglong, _style) << 24);
	if (fonts_.find(key) != fonts_.end()) return fonts_[key];

	Gdiplus::FontFamily family(_family.c_str());
	const auto new_font = new Gdiplus::Font(&family, _size, _style, Gdiplus::UnitPixel);

	fonts_[key] = new_font;
	return new_font;
}

Gdiplus::Image* GraphicResourceManager::GetTexture(const std::wstring& _path)
{
	auto it = textures_.find(_path);
	if (it != textures_.end())
		return it->second;

	// 경로에 파일이 있는지 확인 후 로드
	auto new_img = Gdiplus::Image::FromFile(_path.c_str());
	if (new_img->GetLastStatus() != Gdiplus::Ok)
	{
		// 로드 실패 시 처리 (DebugLog 등)
		SAFE_DELETE(new_img);
		return nullptr;
	}

	textures_[_path] = new_img;
	return new_img;
}

Gdiplus::TextureBrush* GraphicResourceManager::GetTextureBrush(const std::wstring& _path)
{
	if (tex_brushes_.find(_path) != tex_brushes_.end()) return tex_brushes_[_path];

	const auto img = GetTexture(_path);
	if (!img) return
		nullptr;

	const auto new_tex_brush = new Gdiplus::TextureBrush(img);
	tex_brushes_[_path] = new_tex_brush;
	return new_tex_brush;
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
	else
	{
		if (!format_left_)
		{
			format_left_ = new Gdiplus::StringFormat();
			format_left_->SetAlignment(Gdiplus::StringAlignmentNear);
			format_left_->SetLineAlignment(Gdiplus::StringAlignmentNear);
		}
		return format_left_;
	}
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
	tex_brushes_.clear();

	SAFE_DELETE(format_center_);
	SAFE_DELETE(format_left_);
}