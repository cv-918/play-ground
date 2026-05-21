#include "framework.h"
#include "DialogueWindowView.h"

#include "Core/Base/DrawFunctions.h"
#include "EngineSystems/Render/ScreenSystem.h"

#include <algorithm>

namespace
{
    constexpr _float WINDOW_WIDTH_RATIO = 0.74f;
    constexpr _float WINDOW_HEIGHT_RATIO = 0.26f;
    constexpr _float WINDOW_BOTTOM_MARGIN_RATIO = 0.05f;

    constexpr _float WINDOW_PADDING_X = 20.f;
    constexpr _float WINDOW_PADDING_Y = 18.f;
    constexpr _float NAME_BOX_FALLBACK_HEIGHT = 28.f;
    constexpr _float NAME_BOX_TEXTURE_HEIGHT_RATIO = 0.24f;
    constexpr _float NAME_BOX_MIN_TEXTURE_HEIGHT = 36.f;
    constexpr _float NAME_BOX_MAX_WIDTH_RATIO = 0.42f;
    constexpr _float NAME_BOX_TEXT_LEFT_PADDING = 20.f;
    constexpr _float NAME_BOX_TEXT_RIGHT_PADDING = 14.f;
    constexpr _float BODY_TOP_MARGIN = 10.f;
    constexpr _float CHOICE_TOP_MARGIN = 8.f;
    constexpr _float CHOICE_LINE_HEIGHT = 24.f;

    constexpr _float WINDOW_FONT_SIZE = 18.f;
    constexpr _float NAME_FONT_SIZE = 16.f;
    constexpr _float INDICATOR_FONT_SIZE = 16.f;

    constexpr _int NORMAL_MAX_LINE_COUNT = 3;
    constexpr _int CHOICE_MAX_LINE_COUNT = 2;

    const _Color WINDOW_BACKGROUND_FALLBACK_COLOR = Palette::Charcoal;
    const _Color NAME_BOX_BACKGROUND_COLOR = Palette::SlateGray;
    const _Color BODY_TEXT_FALLBACK_COLOR = Palette::White;
    const _Color BODY_TEXT_TEXTURE_COLOR = Palette::Black;
    const _Color CHOICE_TEXT_FALLBACK_COLOR = Palette::DustyGray;
    const _Color CHOICE_TEXT_TEXTURE_COLOR = Palette::DimGray;
    const _Color CHOICE_SELECTED_FALLBACK_COLOR = Palette::White;
    const _Color CHOICE_SELECTED_TEXTURE_COLOR = Palette::Black;
    const _Color INDICATOR_FALLBACK_COLOR = Palette::White;
    const _Color INDICATOR_TEXTURE_COLOR = Palette::Black;

    TextureResource* GetDialogueBoxTexture()
    {
        static const std::wstring k_path = Path::Ui + L"Dialog/Dialog-Box.png";
        return _GraphicSourceMgr.GetTexture(k_path);
    }

    TextureResource* GetNameBoxTexture()
    {
        static const std::wstring k_path = Path::Ui + L"Dialog/Name-Box.png";
        return _GraphicSourceMgr.GetTexture(k_path);
    }

    _float GetTextureAspectRatio(const TextureResource* _texture)
    {
        if (_texture == nullptr || _texture->Width() <= 0 || _texture->Height() <= 0)
            return 0.f;

        return s_float(_texture->Width()) / s_float(_texture->Height());
    }

    _float CalculateWindowHeight(_float _window_width, _float _screen_height, const TextureResource* _texture)
    {
        const _float aspect_ratio = GetTextureAspectRatio(_texture);
        if (aspect_ratio > 0.f)
            return _window_width / aspect_ratio;

        return _screen_height * WINDOW_HEIGHT_RATIO;
    }

    _float CalculateNameBoxHeight(_float _window_height, const TextureResource* _texture)
    {
        if (_texture == nullptr)
            return NAME_BOX_FALLBACK_HEIGHT;

        return std::max(NAME_BOX_MIN_TEXTURE_HEIGHT, _window_height * NAME_BOX_TEXTURE_HEIGHT_RATIO);
    }

    _float CalculateNameBoxWidth(_float _inner_width, _float _name_box_height, const TextureResource* _texture)
    {
        const _float aspect_ratio = GetTextureAspectRatio(_texture);
        if (aspect_ratio <= 0.f)
            return _inner_width;

        const _float max_width = _inner_width * NAME_BOX_MAX_WIDTH_RATIO;
        return std::min(_name_box_height * aspect_ratio, max_width);
    }

    _Color GetBodyTextColor(_bool _using_texture_background)
    {
        return _using_texture_background ? BODY_TEXT_TEXTURE_COLOR : BODY_TEXT_FALLBACK_COLOR;
    }

    _Color GetChoiceTextColor(_bool _is_selected, _bool _using_texture_background)
    {
        if (_using_texture_background)
            return _is_selected ? CHOICE_SELECTED_TEXTURE_COLOR : CHOICE_TEXT_TEXTURE_COLOR;

        return _is_selected ? CHOICE_SELECTED_FALLBACK_COLOR : CHOICE_TEXT_FALLBACK_COLOR;
    }

    _Color GetIndicatorColor(_bool _using_texture_background)
    {
        return _using_texture_background ? INDICATOR_TEXTURE_COLOR : INDICATOR_FALLBACK_COLOR;
    }
}

void DialogueWindowView::Render(const DialogueSessionData& _session_data, const DialogueRuntimeState& _runtime_state) const
{
    const DialogueLine* current_line = GetCurrentLine(_session_data, _runtime_state);
    if (current_line == nullptr)
        return;

    const auto resolution = _ScreenSystem.WindowResolution();
    const _float screen_w = s_float(resolution.width);
    const _float screen_h = s_float(resolution.height);

    const TextureResource* dialogue_box_texture = GetDialogueBoxTexture();
    const _float window_w = screen_w * WINDOW_WIDTH_RATIO;
    const _float window_h = CalculateWindowHeight(window_w, screen_h, dialogue_box_texture);
    const _float window_x = (screen_w - window_w) * 0.5f;
    const _float window_y = screen_h - window_h - (screen_h * WINDOW_BOTTOM_MARGIN_RATIO);

    const _RectF window_rect(window_x, window_y, window_x + window_w, window_y + window_h);
    const _bool using_texture_background = RenderBackground(window_rect, dialogue_box_texture);

    const _float inner_left = window_x + WINDOW_PADDING_X;
    const _float inner_top = window_y + WINDOW_PADDING_Y;
    const _float inner_width = window_w - (WINDOW_PADDING_X * 2.f);

    const _bool has_name_box = current_line->message_type == DialogueMessageType::Dialogue;
    const TextureResource* name_box_texture = has_name_box ? GetNameBoxTexture() : nullptr;
    const _float name_box_h = has_name_box ? CalculateNameBoxHeight(window_h, name_box_texture) : 0.f;
    const _float name_box_w = has_name_box ? CalculateNameBoxWidth(inner_width, name_box_h, name_box_texture) : 0.f;
    const _RectF name_rect(inner_left, inner_top, inner_left + name_box_w, inner_top + name_box_h);
    RenderNameBox(*current_line, name_rect, name_box_texture);

    const _bool has_choices = !current_line->choices.empty();
    const _int body_max_line_count = has_choices ? CHOICE_MAX_LINE_COUNT : NORMAL_MAX_LINE_COUNT;

    const _float body_y = inner_top + (has_name_box ? name_box_h + BODY_TOP_MARGIN : 0.f);
    const _float body_h = WINDOW_FONT_SIZE * s_float(body_max_line_count) + 8.f;
    const _RectF body_rect(inner_left, body_y, inner_left + inner_width, body_y + body_h);
    RenderBodyText(*current_line, body_rect, _runtime_state.page_char_start, _runtime_state.visible_char_count, using_texture_background);

    if (has_choices && _runtime_state.line_state == DialogueLineState::WaitingForChoice)
    {
        const _float choice_y = body_rect.Bottom() + CHOICE_TOP_MARGIN;
        const _float choice_h = CHOICE_LINE_HEIGHT * s_float(current_line->choices.size());
        const _RectF choice_rect(inner_left, choice_y, inner_left + inner_width, choice_y + choice_h);
        RenderChoices(*current_line, choice_rect, _runtime_state.selected_choice_index, using_texture_background);
    }

    const _Point indicator_pos(
        s_int(std::round(window_rect.Right() - WINDOW_PADDING_X - 12.f)),
        s_int(std::round(window_rect.Bottom() - WINDOW_PADDING_Y - 18.f))
    );
    RenderContinueIndicator(_runtime_state, indicator_pos, using_texture_background);
}

const DialogueLine* DialogueWindowView::GetCurrentLine(const DialogueSessionData& _session_data, const DialogueRuntimeState& _runtime_state) const
{
    const int current_line_index = _runtime_state.current_line_index;
    if (current_line_index < 0 || current_line_index >= static_cast<int>(_session_data.lines.size()))
        return nullptr;

    return &_session_data.lines[current_line_index];
}

std::wstring DialogueWindowView::BuildVisibleText(std::wstring_view _full_text, int _page_char_start, int _visible_char_count) const
{
    if (_visible_char_count <= 0)
        return {};

    if (_page_char_start < 0)
        return {};

    if (_page_char_start >= static_cast<int>(_full_text.size()))
        return {};

    return std::wstring(
        _full_text.substr(
            static_cast<size_t>(_page_char_start),
            static_cast<size_t>(_visible_char_count)));
}

_bool DialogueWindowView::RenderBackground(const _RectF& _rect, const TextureResource* _texture) const
{
    if (_texture != nullptr)
    {
        _DrawFunc::DrawTexture(_texture, _rect);
        return true;
    }

    _DrawFunc::FillRectangle(_rect, WINDOW_BACKGROUND_FALLBACK_COLOR);
    return false;
}

void DialogueWindowView::RenderNameBox(const DialogueLine& _line, const _RectF& _rect, const TextureResource* _texture) const
{
    if (_line.message_type != DialogueMessageType::Dialogue)
        return;

    if (_texture != nullptr)
        _DrawFunc::DrawTexture(_texture, _rect);
    else
        _DrawFunc::FillRectangle(_rect, NAME_BOX_BACKGROUND_COLOR);

    const _RectF text_rect(
        _rect.Left() + NAME_BOX_TEXT_LEFT_PADDING,
        _rect.Top(),
        _rect.Right() - NAME_BOX_TEXT_RIGHT_PADDING,
        _rect.Bottom());

    _DrawFunc::DrawString(
        text_rect,
        _line.speaker_name,
        BODY_TEXT_FALLBACK_COLOR,
        NAME_FONT_SIZE,
        _DrawFunc::FONT_STYLE_BOLD,
        _DrawFunc::STRING_ALIGN_NEAR,
        _DrawFunc::STRING_ALIGN_CENTER,
        true);
}

void DialogueWindowView::RenderBodyText(
    const DialogueLine& _line,
    const _RectF& _rect,
    int _page_char_start,
    int _visible_char_count,
    _bool _using_texture_background) const
{
    const std::wstring visible_text = BuildVisibleText(_line.text, _page_char_start, _visible_char_count);

    _DrawFunc::DrawString(
        _rect,
        visible_text,
        GetBodyTextColor(_using_texture_background),
        WINDOW_FONT_SIZE,
        _DrawFunc::FONT_STYLE_REGULAR,
        _DrawFunc::STRING_ALIGN_NEAR,
        _DrawFunc::STRING_ALIGN_NEAR,
        false);
}

void DialogueWindowView::RenderChoices(
    const DialogueLine& _line,
    const _RectF& _rect,
    int _selected_choice_index,
    _bool _using_texture_background) const
{
    for (int i = 0; i < static_cast<int>(_line.choices.size()); ++i)
    {
        const DialogueChoice& choice = _line.choices[i];
        const _Color text_color = GetChoiceTextColor(i == _selected_choice_index, _using_texture_background);

        const _RectF choice_rect(
            _rect.Left(),
            _rect.Top() + (CHOICE_LINE_HEIGHT * s_float(i)),
            _rect.Left() + _rect.Width(),
            _rect.Top() + (CHOICE_LINE_HEIGHT * s_float(i)) + CHOICE_LINE_HEIGHT
        );

        _DrawFunc::DrawString(
            choice_rect,
            choice.text,
            text_color,
            WINDOW_FONT_SIZE,
            _DrawFunc::FONT_STYLE_REGULAR,
            _DrawFunc::STRING_ALIGN_NEAR,
            _DrawFunc::STRING_ALIGN_NEAR,
            true);
    }
}

void DialogueWindowView::RenderContinueIndicator(
    const DialogueRuntimeState& _runtime_state,
    const _Point& _pos,
    _bool _using_texture_background) const
{
    switch (_runtime_state.line_state)
    {
    case DialogueLineState::WaitingForNext:
    case DialogueLineState::AutoAdvancing:
        _DrawFunc::DrawString(_pos, L"▼", GetIndicatorColor(_using_texture_background), INDICATOR_FONT_SIZE, false);
        break;

    default:
        break;
    }
}
