#include "framework.h"
#include "DialogueTextLayouter.h"

#include "Core/Base/DrawFunctions.h"

namespace
{
	_bool IsBreakableChar(wchar_t _ch)
	{
		return _ch == L' ' || _ch == L'\n' || _ch == L'\t' || _ch == L'\r';
	}
}

void DialogueTextLayouter::BuildPages(
	const std::wstring& _text,
	_float _max_width,
	_float _max_height,
	_float _font_size,
	_int _style_bitmask,
	std::vector<DialoguePageRange>& _out_pages)
{
	_out_pages.clear();

	if (_text.empty())
	{
		_out_pages.push_back({ 0, 0 });
		return;
	}

	const _int text_length = s_int(_text.size());
	_int start_index = 0;

	while (start_index < text_length)
	{
		_int end_index = FindPageEndIndex(
			_text,
			start_index,
			_max_width,
			_max_height,
			_font_size,
			_style_bitmask);

		// 방어 코드
		if (end_index <= start_index)
		{
			end_index = start_index + 1;
		}

		end_index = AdjustEndIndexForWordBoundary(_text, start_index, end_index);

		// 방어 코드
		if (end_index <= start_index)
		{
			end_index = start_index + 1;
		}

		_out_pages.push_back({ start_index, end_index });
		start_index = end_index;
	}
}

_bool DialogueTextLayouter::FitsInRect(
	const std::wstring& _text,
	_int _start_index,
	_int _end_index,
	_float _max_width,
	_float _max_height,
	_float _font_size,
	_int _style_bitmask)
{
	if (_start_index < 0 || _end_index < _start_index || _end_index > s_int(_text.size()))
		return false;

	const std::wstring sub_text = _text.substr(_start_index, _end_index - _start_index);

	const _Vector2 size = _DrawFunc::MeasureString(
		sub_text,
		_font_size,
		_style_bitmask,
		_max_width,
		false);

	return size.y <= _max_height;
}

_int DialogueTextLayouter::FindPageEndIndex(
	const std::wstring& _text,
	_int _start_index,
	_float _max_width,
	_float _max_height,
	_float _font_size,
	_int _style_bitmask)
{
	const _int text_length = s_int(_text.size());

	_int low = _start_index + 1;
	_int high = text_length;
	_int best = _start_index + 1;

	// 이진 탐색으로 "들어가는 최대 end_index"를 찾는다.
	while (low <= high)
	{
		const _int mid = (low + high) / 2;

		if (FitsInRect(_text, _start_index, mid, _max_width, _max_height, _font_size, _style_bitmask))
		{
			best = mid;
			low = mid + 1;
		}
		else
		{
			high = mid - 1;
		}
	}

	return best;
}

_int DialogueTextLayouter::AdjustEndIndexForWordBoundary(
	const std::wstring& _text,
	_int _start_index,
	_int _end_index)
{
	if (_end_index >= s_int(_text.size()))
		return _end_index;

	// 현재 잘린 위치 바로 앞이 공백/개행이면 그대로 둔다.
	if (_end_index > _start_index && IsBreakableChar(_text[_end_index - 1]))
		return _end_index;

	// 가능한 경우 마지막 공백/개행 위치까지 뒤로 당긴다.
	for (_int i = _end_index - 1; i > _start_index; --i)
	{
		if (IsBreakableChar(_text[i]))
		{
			// 공백 문자 자체는 다음 페이지 시작으로 넘긴다.
			return i + 1;
		}
	}

	return _end_index;
}